import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Role } from '../src/auth/roles';
import { PrismaService } from '../src/prisma/prisma.service';
import { registerAs } from './helpers';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MISSING_ID = '00000000-0000-7000-8000-000000000000';

describe('Uploads (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let editor: { Authorization: string };
  let reader: { Authorization: string };
  // Bytes novos a cada execução: o sha256 não colide com imagens que já estejam no banco
  const png = Buffer.concat([PNG_SIGNATURE, randomBytes(256)]);
  const http = () => request(app.getHttpServer());
  const upload = (auth: object, file: Buffer, name = 'diagrama.png', field = 'file') =>
    http().post('/uploads').set(auth).attach(field, file, name);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const stamp = Date.now();
    editor = (
      await registerAs(app, prisma, Role.EDITOR, {
        name: 'Upload E2E',
        email: `e2e-uploads-e-${stamp}@example.com`,
      })
    ).auth;
    reader = (
      await registerAs(app, prisma, Role.READER, {
        name: 'Leitor E2E',
        email: `e2e-uploads-r-${stamp}@example.com`,
      })
    ).auth;
  });

  afterAll(async () => {
    // Imagens primeiro: elas referenciam os usuários de teste
    await prisma?.upload.deleteMany({ where: { uploadedBy: { email: { startsWith: 'e2e-uploads-' } } } });
    await prisma?.user.deleteMany({ where: { email: { startsWith: 'e2e-uploads-' } } });
    await app?.close();
  });

  it('requires an editor to upload', async () => {
    await http().post('/uploads').attach('file', png, 'x.png').expect(401);
    await upload(reader, png).expect(403);
  });

  it('stores an image and serves it back with a long cache and an ETag', async () => {
    const created = await upload(editor, png, 'visão geral.png').expect(201);
    expect(created.body).toEqual({
      id: expect.any(String),
      fileName: 'visão geral.png',
      mimeType: 'image/png',
      size: png.length,
      path: `/uploads/${created.body.id}`,
    });

    const served = await http().get(created.body.path).buffer(true).expect(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect(served.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(Buffer.compare(served.body as Buffer, png)).toBe(0);

    await http().get(created.body.path).set('If-None-Match', served.headers.etag).expect(304);
  });

  it('reuses the record when the same file is sent again', async () => {
    const first = await upload(editor, png, 'outro-nome.png').expect(201);
    const second = await upload(editor, png, 'mais-um.png').expect(201);
    expect(second.body.id).toBe(first.body.id);
  });

  it('accepts only real images, whatever the name says', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const res = await upload(editor, svg, 'disfarce.png').expect(415);
    expect(res.body.message).toBe('Formato não suportado: envie PNG, JPEG, GIF ou WebP');
  });

  it('explains a missing file, a wrong field and a file that is too large', async () => {
    const missing = await http().post('/uploads').set(editor).expect(400);
    expect(missing.body.message).toBe('Envie uma imagem no campo "file"');

    const wrongField = await upload(editor, png, 'x.png', 'imagem').expect(400);
    expect(wrongField.body.message).toBe('Envie uma única imagem, no campo "file"');

    const big = Buffer.concat([PNG_SIGNATURE, Buffer.alloc(5 * 1024 * 1024)]);
    const tooLarge = await upload(editor, big).expect(413);
    expect(tooLarge.body.message).toBe('A imagem deve ter no máximo 5 MB');
  });

  it('answers 404 for an unknown image and 400 for an invalid id', async () => {
    await http().get(`/uploads/${MISSING_ID}`).expect(404);
    await http().get('/uploads/nao-e-um-id').expect(400);
  });
});
