import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '@prisma/client';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('RolesGuard (RBAC Otorisasi)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(user: any): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  // [RBAC-01] Rute tanpa @Roles diizinkan untuk semua
  it('[RBAC-01] mengizinkan request jika endpoint tidak mensyaratkan role tertentu', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ role: Role.KETUA_KELAS });
    expect(guard.canActivate(context)).toBe(true);
  });

  // [RBAC-02] Admin diizinkan mengakses rute yang mensyaratkan role ADMIN
  it('[RBAC-02] mengizinkan jika role user sesuai dengan role yang disyaratkan', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMockContext({ role: Role.ADMIN });
    expect(guard.canActivate(context)).toBe(true);
  });

  // [RBAC-03] Ketua Kelas ditolak mengakses rute yang hanya untuk Admin
  it('[RBAC-03] melempar ForbiddenException jika role user tidak memenuhi syarat', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMockContext({ role: Role.KETUA_KELAS });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  // [RBAC-04] Guru Piket ditolak jika rute hanya untuk Admin
  it('[RBAC-04] melempar ForbiddenException untuk Guru Piket pada endpoint khusus Admin', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMockContext({ role: Role.GURU_PIKET });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
