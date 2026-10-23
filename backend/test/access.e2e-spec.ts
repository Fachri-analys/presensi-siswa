import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { loginAndGetCookie } from './helpers/auth.helper';

describe('Akses E2E Tests (Blok 0, B1, B2)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1', {
      exclude: ['health', 'api/docs', 'api/docs-json'],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('Admin GET /students = 200', async () => {
    const adminCookies = await loginAndGetCookie(
      app,
      'admin.test@smkn11jakarta.sch.id',
      process.env.TEST_ADMIN_PASSWORD || 'Admin#2026Password!',
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/students')
      .set('Cookie', adminCookies);

    expect(response.status).toBe(200);
  });

  it('Ketua A GET students/:idKelasB = 403', async () => {
    const ketuaACookies = await loginAndGetCookie(
      app,
      'ketua.test@smkn11jakarta.sch.id',
      process.env.TEST_KETUA_PASSWORD || 'Ketua#2026Password!',
    );

    // Siswa di kelas B (X PPLG 1: nis 251101)
    const studentInKelasB = await prisma.student.findUnique({
      where: { nis: '251101' },
    });
    expect(studentInKelasB).toBeDefined();

    const response = await request(app.getHttpServer())
      .get(`/api/v1/students/${studentInKelasB!.id}`)
      .set('Cookie', ketuaACookies);

    expect(response.status).toBe(403);
  });

  it('Ketua kelasId null GET students = 403', async () => {
    const ketuaNullCookies = await loginAndGetCookie(
      app,
      'ketua.nokelas@smkn11jakarta.sch.id',
      process.env.TEST_KETUA_PASSWORD || 'Ketua#2026Password!',
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/students')
      .set('Cookie', ketuaNullCookies);

    expect(response.status).toBe(403);
  });
});
