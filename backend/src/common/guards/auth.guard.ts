import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from '../../modules/auth/auth.service';
import type { SessionUser } from '../types/session-user.type';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractSessionToken(request);

    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Sesi tidak ditemukan. Silakan login.',
      });
    }

    const user = await this.authService.validateSession(token);
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Sesi tidak valid atau sudah berakhir. Silakan login ulang.',
      });
    }

    (request as Request & { user?: SessionUser }).user = user;
    return true;
  }

  private extractSessionToken(request: Request): string | null {
    const cookies = request.cookies as Record<string, string> | undefined;
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'presensi_session';
    return cookies?.[cookieName] ?? null;
  }
}
