import { validationSchema } from './validation';

const productionEnvironment = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://presensi:secret@db.example.com:5432/presensi?schema=public',
  CORS_ORIGINS: 'https://presensi.example.com',
};

describe('production environment validation', () => {
  it('accepts HTTPS app origins and a remote PostgreSQL database', () => {
    expect(validationSchema.validate(productionEnvironment).error).toBeUndefined();
  });

  it('rejects local database URLs and non-HTTPS app origins', () => {
    const result = validationSchema.validate({
      ...productionEnvironment,
      DATABASE_URL: 'postgresql://presensi:presensi_dev_password@localhost:5432/presensi_dev',
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
