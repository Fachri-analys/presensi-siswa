import * as Joi from 'joi';

const productionCorsOrigins = Joi.string()
  .required()
  .custom((value, helpers) => {
    const invalidOrigin = value.split(',').some((item: string) => {
      const origin = item.trim();
      try {
        const url = new URL(origin);
        return url.protocol !== 'https:' || url.origin !== origin;
      } catch {
        return true;
      }
    });
    return invalidOrigin ? helpers.error('any.invalid') : value;
  });

const productionDatabaseUrl = Joi.string()
  .required()
  .custom((value, helpers) => {
    try {
      const url = new URL(value);
      if (url.protocol !== 'file:' || !url.pathname.startsWith('/app/data/')) {
        return helpers.error('any.invalid');
      }
      return value;
    } catch {
      return helpers.error('any.invalid');
    }
  });

export const validationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(4000),
  CORS_ORIGINS: Joi.when('NODE_ENV', {
    is: 'production',
    then: productionCorsOrigins,
    otherwise: Joi.string().default('http://localhost:3000'),
  }),
  INITIAL_ADMIN_EMAIL: Joi.string().email().optional().allow(''),
  INITIAL_ADMIN_PASSWORD: Joi.string().min(12).optional().allow(''),

  // Database
  DATABASE_URL: Joi.when('NODE_ENV', {
    is: 'production',
    then: productionDatabaseUrl,
    otherwise: Joi.string().required().messages({
      'any.required': 'DATABASE_URL wajib diisi (contoh: file:./prisma/dev.db)',
    }),
  }),

  // Session
  SESSION_COOKIE_NAME: Joi.string().default('presensi_session'),
  SESSION_MAX_AGE_MS: Joi.number().integer().positive().default(28800000),
  SESSION_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),

  // School calendar (ISO weekdays: Monday=1 ... Sunday=7)
  SCHOOL_WORKING_DAYS: Joi.string().pattern(/^[1-7](,[1-7])*$/).default('1,2,3,4,5'),
  SCHOOL_HOLIDAYS: Joi.string().allow('').default('').custom((value, helpers) => {
    const invalidDate = value.split(',').filter(Boolean).some((item: string) => {
      const date = item.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return true;
      const parsed = new Date(`${date}T00:00:00.000Z`);
      return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date;
    });
    return invalidDate ? helpers.error('any.invalid') : value;
  }),

  // Security
  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),

  // Upload
  UPLOAD_DIR: Joi.string().default('./uploads'),
  UPLOAD_MAX_SIZE_BYTES: Joi.number().integer().positive().default(5242880),
});
