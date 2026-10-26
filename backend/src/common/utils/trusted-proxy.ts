interface ExpressAppLike {
  set(setting: string, value: unknown): void;
}

export function configureTrustedProxy(expressApp: ExpressAppLike, nodeEnv: string): void {
  if (nodeEnv === 'production') {
    expressApp.set('trust proxy', 1);
  }
}
