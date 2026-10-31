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
  let adminCookies: string[];
  let guruCookies: string[];
  let ketuaCookies: string[];
  let ketuaNullCookies: string[];
  const requireTestPassword = (name: string) => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} wajib diatur untuk menjalankan E2E test.`);
    return value;
  };

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
    adminCookies = await loginAndGetCookie(
      app,
      'admin.test@smkn11jakarta.sch.id',
      requireTestPassword('TEST_ADMIN_PASSWORD'),
    );
    guruCookies = await loginAndGetCookie(
      app,
      'guru.test@smkn11jakarta.sch.id',
      requireTestPassword('TEST_GURU_PASSWORD'),
    );
    ketuaCookies = await loginAndGetCookie(
      app,
      'ketua.test@smkn11jakarta.sch.id',
      requireTestPassword('TEST_KETUA_PASSWORD'),
    );
    ketuaNullCookies = await loginAndGetCookie(
      app,
      'ketua.nokelas@smkn11jakarta.sch.id',
      requireTestPassword('TEST_KETUA_PASSWORD'),
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('SQLite enforces declared foreign keys', async () => {
    const [result] = await prisma.$queryRaw<Array<{ foreign_keys: bigint }>>`PRAGMA foreign_keys`;
    expect(Number(result.foreign_keys)).toBe(1);
  });

  it('Admin GET /students = 200', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/students')
      .set('Cookie', adminCookies);

    expect(response.status).toBe(200);
  });

  it('pencarian siswa tetap tidak peka huruf besar kecil ASCII di SQLite', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/students')
      .query({ search: 'siswa kelas b e2e' })
      .set('Cookie', adminCookies);

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ nis: 'e2e-student-kelas-b' })]),
    );
  });

  it('Guru Piket dapat membaca siswa tetapi tidak dapat membuat data siswa', async () => {
    const readResponse = await request(app.getHttpServer())
      .get('/api/v1/students')
      .set('Cookie', guruCookies);
    const writeResponse = await request(app.getHttpServer())
      .post('/api/v1/students')
      .set('Cookie', guruCookies)
      .set('Origin', 'http://localhost:3000')
      .send({ nis: 'should-not-write', nama: 'Blocked', kelasId: 'missing' });

    expect(readResponse.status).toBe(200);
    expect(writeResponse.status).toBe(403);
  });

  it('Admin mengelola akun; Guru Piket dan Ketua Kelas ditolak dari endpoint akun', async () => {
    const adminResponse = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Cookie', adminCookies);
    const guruResponse = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Cookie', guruCookies);
    const ketuaResponse = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Cookie', ketuaCookies);

    expect(adminResponse.status).toBe(200);
    expect(guruResponse.status).toBe(403);
    expect(ketuaResponse.status).toBe(403);
  });

  it('Ketua A GET students/:idKelasB = 403', async () => {
    const studentInKelasB = await prisma.student.findUnique({
      where: { nis: 'e2e-student-kelas-b' },
    });
    expect(studentInKelasB).toBeDefined();

    const response = await request(app.getHttpServer())
      .get(`/api/v1/students/${studentInKelasB!.id}`)
      .set('Cookie', ketuaCookies);

    expect(response.status).toBe(403);
  });

  it('Ketua kelasId null GET students = 403', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/students')
      .set('Cookie', ketuaNullCookies);

    expect(response.status).toBe(403);
  });

  it('Ketua Kelas dapat membaca siswa kelasnya sendiri', async () => {
    const ketua = await prisma.user.findUnique({
      where: { email: 'ketua.test@smkn11jakarta.sch.id' },
      select: { kelasId: true },
    });
    const response = await request(app.getHttpServer())
      .get('/api/v1/students')
      .query({ kelasId: ketua?.kelasId })
      .set('Cookie', ketuaCookies);

    expect(response.status).toBe(200);
  });
});
