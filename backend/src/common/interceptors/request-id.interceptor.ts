import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const incoming = request.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(incoming)
        ? incoming
        : randomUUID();

    (request as any).requestId = requestId;
    response.setHeader('X-Request-Id', requestId);

    return next.handle();
  }
}
