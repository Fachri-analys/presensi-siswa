import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../../modules/auth/auth.service';

describe('AuthGuard (Global Authentication & @Public)', () => {
  let guard: AuthGuard;
  let authService: Partial<AuthService>;
  let reflector: Reflector;

  beforeEach(() => {
    authService = {
      validateSession: jest.fn(),
    };
    reflector = new Reflector();
    guard = new AuthGuard(authService as AuthService, reflector);
  });

  const createMockContext = (request: any, isPublic = false): ExecutionContext => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: jest.fn(),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  it('[AUTH-01] mengizinkan akses jika endpoint diberi decorator @Public()', async () => {
    const req = { cookies: {} };
    const context = createMockContext(req, true);

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
    expect(authService.validateSession).not.toHaveBeenCalled();
  });

  it('[AUTH-02] melempar UnauthorizedException jika tidak ada token session dan bukan @Public()', async () => {
    const req = { cookies: {} };
    const context = createMockContext(req, false);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('[AUTH-03] mengizinkan dan memasang req.user jika session token valid', async () => {
    const mockUser = {
      id: 'usr-1',
      email: 'admin@smkn11jakarta.sch.id',
      nama: 'Admin',
      role: 'ADMIN' as any,
      kelasId: null,
    };
    (authService.validateSession as jest.Mock).mockResolvedValueOnce(mockUser);

    const req: any = {
      cookies: { presensi_session: 'valid-token' },
    };
    const context = createMockContext(req, false);

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
    expect(req.user).toEqual(mockUser);
  });
});
