import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export async function loginAndGetCookie(
  app: INestApplication,
  email: string,
  password = 'Ketua#2026Password!',
): Promise<string[]> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);

  const cookies = response.headers['set-cookie'];
  if (!cookies) {
    throw new Error(`Failed to obtain session cookie for ${email}`);
  }
  return Array.isArray(cookies) ? cookies : [cookies];
}
