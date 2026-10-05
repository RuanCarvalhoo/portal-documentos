import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '../auth/roles';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

const user = { id: 'u2', name: 'Pessoa', email: 'p@example.com', role: Role.EDITOR, createdAt: new Date() };

describe('UsersService', () => {
  const prisma = {
    user: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const service = new UsersService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function' ? arg(prisma) : Promise.all(arg as Promise<unknown>[]),
    );
  });

  it('lists the accounts with pagination metadata and without the password hash', async () => {
    prisma.user.findMany.mockResolvedValue([user]);
    prisma.user.count.mockResolvedValue(1);

    expect(await service.findAll({ page: 1, limit: 20 })).toEqual({
      data: [user],
      meta: { total: 1, page: 1, limit: 20 },
    });
    expect(prisma.user.findMany.mock.calls[0][0].select).not.toHaveProperty('passwordHash');
  });

  it('promotes an account', async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: 'admin' }]);
    prisma.user.findUnique.mockResolvedValue({ role: Role.READER });
    prisma.user.update.mockResolvedValue(user);

    await expect(service.updateRole('u2', Role.EDITOR, 'admin')).resolves.toEqual(user);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { role: Role.EDITOR } }));
  });

  it('refuses to demote the only admin', async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: 'admin' }]);
    prisma.user.findUnique.mockResolvedValue({ role: Role.ADMIN });

    await expect(service.updateRole('admin', Role.EDITOR, 'admin')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('demotes an admin while another one remains', async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);
    prisma.user.findUnique.mockResolvedValue({ role: Role.ADMIN });
    prisma.user.update.mockResolvedValue({ ...user, role: Role.READER });

    await expect(service.updateRole('a2', Role.READER, 'a1')).resolves.toMatchObject({ role: Role.READER });
  });

  it('answers 404 for an unknown account', async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: 'admin' }]);
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.updateRole('ghost', Role.EDITOR, 'admin')).rejects.toBeInstanceOf(NotFoundException);
  });
});
