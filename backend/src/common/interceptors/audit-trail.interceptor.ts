import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { AuditResult } from '@prisma/client';
import type { Request } from 'express';
import { catchError, tap, throwError, type Observable } from 'rxjs';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';
import type { SessionUser } from '../types/session-user.type';

const AUDITED_RESOURCES = new Set(['users', 'students', 'teachers', 'classes', 'sick-letters']);

@Injectable()
export class AuditTrailInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & {
      user?: SessionUser;
      requestId?: string;
    }>();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return next.handle();

    const routeParts = request.path.split('/').filter(Boolean);
    const resource = routeParts[0] === 'api' ? routeParts[2] ?? '' : routeParts[0] ?? '';
    if (!AUDITED_RESOURCES.has(resource) || !request.user) return next.handle();

    const auditBase = {
        actorId: request.user!.id,
        action: `${request.method}_${resource.toUpperCase().replaceAll('-', '_')}`,
        objectType: resource.toUpperCase().replaceAll('-', '_'),
        objectId: request.params.id ?? request.params.kelasId ?? null,
        requestId: request.requestId,
        ipAddress: request.ip,
        userAgent: request.get('user-agent') ?? null,
    };
    return next.handle().pipe(
      tap((response: unknown) => {
        const responseId = typeof response === 'object' && response !== null && 'id' in response
          ? String((response as { id: unknown }).id)
          : null;
        void this.audit.log({
          ...auditBase,
          objectId: auditBase.objectId ?? responseId,
          result: AuditResult.SUCCESS,
        });
      }),
      catchError((error: unknown) => {
        const statusCode = typeof error === 'object' && error !== null && 'status' in error
          ? (error as { status?: number }).status ?? 500
          : 500;
        void this.audit.log({
          ...auditBase,
          result: AuditResult.FAILURE,
          metadata: { statusCode },
        });
        return throwError(() => error);
      }),
    );
  }
}
