export function createContentSecurityPolicy(nonce: string, apiOrigin: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "script-src-attr 'none'",
    `connect-src 'self' ${apiOrigin}`,
  ].join('; ');
}
