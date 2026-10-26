import { configureTrustedProxy } from './trusted-proxy';

describe('configureTrustedProxy', () => {
  it('trusts one proxy hop only in production', () => {
    const expressApp = { set: jest.fn() };

    configureTrustedProxy(expressApp, 'production');

    expect(expressApp.set).toHaveBeenCalledWith('trust proxy', 1);
  });

  it('does not trust forwarded IP headers in development', () => {
    const expressApp = { set: jest.fn() };

    configureTrustedProxy(expressApp, 'development');

    expect(expressApp.set).not.toHaveBeenCalled();
  });
});
