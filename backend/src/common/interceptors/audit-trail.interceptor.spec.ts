import { of, lastValueFrom, throwError } from 'rxjs';
import { AuditResult } from '@prisma/client';
import { AuditTrailInterceptor } from './audit-trail.interceptor';

describe('AuditTrailInterceptor', () => {
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const interceptor = new AuditTrailInterceptor(audit as never);

  beforeEach(() => audit.log.mockClear());

  function context(method: string, path = '/api/v1/students/123') {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          path,
          baseUrl: '/api/v1/students',
          params: { id: '123' },
          requestId: 'req-1',
          ip: '127.0.0.1',
          user: { id: 'user-1' },
          get: () => 'test-agent',
        }),
      }),
    } as never;
  }

  it('records actor, target, and request context for successful writes', async () => {
    await lastValueFrom(interceptor.intercept(context('PATCH'), { handle: () => of({ ok: true }) } as never));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'user-1', objectType: 'STUDENTS', objectId: '123', requestId: 'req-1', result: AuditResult.SUCCESS,
    }));
  });

  it('records a failed write without swallowing its error', async () => {
    await expect(lastValueFrom(interceptor.intercept(
      context('DELETE'),
      { handle: () => throwError(() => Object.assign(new Error('conflict'), { status: 409 })) } as never,
    ))).rejects.toThrow('conflict');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      result: AuditResult.FAILURE, metadata: { statusCode: 409 },
    }));
  });

  it('does not log reads', async () => {
    await lastValueFrom(interceptor.intercept(context('GET'), { handle: () => of([]) } as never));
    expect(audit.log).not.toHaveBeenCalled();
  });
});
