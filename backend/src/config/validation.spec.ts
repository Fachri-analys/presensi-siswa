import { validationSchema } from './validation';

const productionEnvironment = {
  NODE_ENV: 'production',
  DATABASE_URL: 'file:/app/data/presensi.db',
  CORS_ORIGINS: 'https://presensi.example.com',
};

describe('production environment validation', () => {
  it('accepts HTTPS app origins and the persistent production SQLite path', () => {
    expect(validationSchema.validate(productionEnvironment).error).toBeUndefined();
  });

  it('rejects SQLite paths outside persistent storage and non-HTTPS app origins', () => {
    const result = validationSchema.validate({
      ...productionEnvironment,
      DATABASE_URL: 'file:/tmp/presensi.db',
      CORS_ORIGINS: 'http://presensi.example.com',
    });

    expect(result.error).toBeDefined();
  });

  it('requires an explicit frontend origin', () => {
    expect(validationSchema.validate({
      NODE_ENV: 'production',
      DATABASE_URL: productionEnvironment.DATABASE_URL,
    }).error).toBeDefined();
  });

});
