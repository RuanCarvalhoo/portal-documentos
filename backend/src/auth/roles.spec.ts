import { hasRole, Role } from './roles';

describe('hasRole', () => {
  it('lets each role do what the roles below it can', () => {
    expect(hasRole(Role.ADMIN, Role.EDITOR)).toBe(true);
    expect(hasRole(Role.ADMIN, Role.ADMIN)).toBe(true);
    expect(hasRole(Role.EDITOR, Role.EDITOR)).toBe(true);
    expect(hasRole(Role.EDITOR, Role.READER)).toBe(true);
  });

  it('never lets a role act above itself', () => {
    expect(hasRole(Role.READER, Role.EDITOR)).toBe(false);
    expect(hasRole(Role.EDITOR, Role.ADMIN)).toBe(false);
  });
});
