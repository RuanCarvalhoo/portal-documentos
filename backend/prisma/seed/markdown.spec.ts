import { localImages, resolveTarget, rewriteLinks, splitTitle } from './markdown';

const targets = {
  pages: new Map([
    ['adr/001-banco.md', 'p-adr'],
    ['seguranca.md', 'p-seg'],
  ]),
  images: new Map([['diagramas/01-visao-geral.png', 'u-1']]),
  repositoryUrl: 'https://github.com/dono/repo/blob/main',
};

describe('splitTitle', () => {
  it('takes the first heading as the title and removes it from the body', () => {
    expect(splitTitle('# ADR 001 — Banco\n\n**Status:** aceito\n')).toEqual({
      title: 'ADR 001 — Banco',
      body: '**Status:** aceito\n',
    });
  });

  it('refuses a document without a title', () => {
    expect(() => splitTitle('Texto solto\n')).toThrow('Documento sem título');
  });
});

describe('rewriteLinks', () => {
  const from = 'arquitetura/visao-geral.md';

  it('points documents that became pages to the page, keeping the anchor', () => {
    expect(
      rewriteLinks('Veja [ADR](../adr/001-banco.md) e [limites](../seguranca.md#rate-limit).', from, targets),
    ).toBe('Veja [ADR](/pages/p-adr) e [limites](/pages/p-seg#rate-limit).');
  });

  it('points images to the uploads served by the portal', () => {
    expect(rewriteLinks('![Visão geral](../diagramas/01-visao-geral.png)', from, targets)).toBe(
      '![Visão geral](/api/uploads/u-1)',
    );
  });

  it('links other repository files to the repository, inside and outside docs/', () => {
    expect(rewriteLinks('[schema](../../backend/prisma/schema.prisma)', from, targets)).toBe(
      '[schema](https://github.com/dono/repo/blob/main/backend/prisma/schema.prisma)',
    );
    expect(rewriteLinks('[fonte](../diagramas/01-visao-geral.excalidraw)', from, targets)).toBe(
      '[fonte](https://github.com/dono/repo/blob/main/docs/diagramas/01-visao-geral.excalidraw)',
    );
  });

  it('keeps absolute links, anchors and code examples untouched', () => {
    const markdown = [
      '[site](https://commonmark.org) [topo](#titulos) [api](/api/uploads/x)',
      '```markdown',
      '[relativo](../seguranca.md)',
      '```',
    ].join('\n');
    expect(rewriteLinks(markdown, from, targets)).toBe(markdown);
  });

  it('fails loudly on an image that was not uploaded', () => {
    expect(() => rewriteLinks('![x](../diagramas/faltando.png)', from, targets)).toThrow(
      'Imagem não enviada',
    );
  });
});

describe('localImages', () => {
  it('lists the local images outside code blocks, relative to docs/', () => {
    const markdown = '![a](../diagramas/a.png) ![b](https://x/b.png)\n```\n![c](c.png)\n```';
    expect(localImages(markdown, 'arquitetura/x.md')).toEqual(['diagramas/a.png']);
  });

  it('resolves targets with spaces and anchors', () => {
    expect(resolveTarget('guias/a.md', '../adr/Um%20doc.md#parte')).toEqual({
      path: 'adr/Um doc.md',
      hash: 'parte',
    });
  });
});
