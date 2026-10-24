import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    const origin = request.get('origin');
    const fetchSite = request.get('sec-fetch-site');
    const allowedOrigins = this.config.get<string[]>('app.corsOrigins', []);

    if ((origin && !allowedOrigins.includes(origin)) || fetchSite === 'cross-site') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Asal permintaan tidak diizinkan.' });
    }

    return true;
  }
}
