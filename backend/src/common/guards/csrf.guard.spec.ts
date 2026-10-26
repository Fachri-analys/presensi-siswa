import { ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
  const allowedOrigin = 'https://presensi.example.sch.id';
  const guard = new CsrfGuard({ get: () => [allowedOrigin] } as never);

  function context(method: string, headers: Record<string, string> = {}) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          get: (name: string) => headers[name.toLowerCase()],
        }),
      }),
    } as never;
  }

  it('allows safe methods without Origin', () => {
    expect(guard.canActivate(context('GET'))).toBe(true);
  });

  it('allows writes from a configured origin', () => {
    expect(guard.canActivate(context('POST', { origin: allowedOrigin, 'sec-fetch-site': 'same-site' }))).toBe(true);
  });

  it.each([
    ['missing Origin', {}],
    ['untrusted Origin', { origin: 'https://attacker.example' }],
    ['cross-site request', { origin: allowedOrigin, 'sec-fetch-site': 'cross-site' }],
  ])('rejects %s', (_label, headers) => {
    expect(() => guard.canActivate(context('PATCH', headers))).toThrow(ForbiddenException);
  });
});
