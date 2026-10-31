import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/modules/users/users.service';
import { ActiveStatus, Role } from '@prisma/client';
import { loginAndGetCookie } from './helpers/auth.helper';

describe('Akses E2E Tests (Blok 0, B1, B2)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookies: string[];
  let guruCookies: string[];
  let ketuaCookies: string[];
  let ketuaNullCookies: string[];
  let uploadDir: string;
  let previousUploadDir: string | undefined;
  const requireTestPassword = (name: string) => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} wajib diatur untuk menjalankan E2E test.`);
    return value;
  };

  beforeAll(async () => {
    previousUploadDir = process.env.UPLOAD_DIR;
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'presensi-e2e-uploads-'));
    process.env.UPLOAD_DIR = uploadDir;
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
    if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = previousUploadDir;
    if (uploadDir) fs.rmSync(uploadDir, { recursive: true, force: true });
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

  it('menolak tambah/pindah siswa ke kelas nonaktif', async () => {
    const activeClass = await prisma.class.findUniqueOrThrow({ where: { nama: 'E2E Kelas A' } });
    const retiredClass = await prisma.class.findUniqueOrThrow({ where: { nama: 'E2E Kelas B' } });
    const student = await prisma.student.create({
      data: { nis: 'e2e-inactive-class-check', nama: 'Uji Kelas Aktif', kelasId: activeClass.id },
    });
    await prisma.class.update({ where: { id: retiredClass.id }, data: { status: 'inactive' } });

    try {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Cookie', adminCookies)
        .set('Origin', 'http://localhost:3000')
        .send({ nis: 'e2e-inactive-class-new', nama: 'Tidak Boleh Ditambah', kelasId: retiredClass.id });
      const moveResponse = await request(app.getHttpServer())
        .patch(`/api/v1/students/${student.id}`)
        .set('Cookie', adminCookies)
        .set('Origin', 'http://localhost:3000')
        .send({ kelasId: retiredClass.id });

      expect(createResponse.status).toBe(409);
      expect(moveResponse.status).toBe(409);
    } finally {
      await prisma.class.update({ where: { id: retiredClass.id }, data: { status: 'active' } });
      await prisma.student.delete({ where: { id: student.id } });
    }
  });

  it('mendukung pagination siswa di atas 100 data dan total yang konsisten', async () => {
    const paginationClass = await prisma.class.create({
      data: { nama: 'E2E Kelas Pagination', jurusan: 'E2E' },
    });
    await prisma.student.createMany({
      data: Array.from({ length: 105 }, (_, index) => ({
        nis: `e2e-page-${String(index).padStart(3, '0')}`,
        nama: `Siswa Pagination ${index}`,
        kelasId: paginationClass.id,
      })),
    });

    try {
      const firstPage = await request(app.getHttpServer())
        .get('/api/v1/students')
        .query({ kelasId: paginationClass.id, limit: 100, page: 1 })
        .set('Cookie', adminCookies);
      const secondPage = await request(app.getHttpServer())
        .get('/api/v1/students')
        .query({ kelasId: paginationClass.id, limit: 100, page: 2 })
        .set('Cookie', adminCookies);
      const classes = await request(app.getHttpServer())
        .get('/api/v1/classes')
        .set('Cookie', adminCookies);

      expect(firstPage.status).toBe(200);
      expect(firstPage.body.items).toHaveLength(100);
      expect(firstPage.body.total).toBe(105);
      expect(firstPage.body.nextCursor).toBe('2');
      expect(secondPage.status).toBe(200);
      expect(secondPage.body.items).toHaveLength(5);
      expect(secondPage.body.total).toBe(105);
      expect(classes.body.find((item: { id: string }) => item.id === paginationClass.id).totalSiswa).toBe(105);
    } finally {
      await prisma.student.deleteMany({ where: { kelasId: paginationClass.id } });
      await prisma.class.delete({ where: { id: paginationClass.id } });
    }
  });

  it('menghapus lampiran surat sakit ketika data siswa dihapus permanen', async () => {
    const kelas = await prisma.class.findUniqueOrThrow({ where: { nama: 'E2E Kelas A' } });
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin.test@smkn11jakarta.sch.id' } });
    const student = await prisma.student.create({
      data: { nis: 'e2e-student-letter-delete', nama: 'Uji Hapus Lampiran', kelasId: kelas.id },
    });
    const filePath = path.join(uploadDir, 'e2e-letter.pdf');
    fs.writeFileSync(filePath, 'test-only');
    await prisma.sickLetter.create({
      data: {
        date: new Date('2026-10-30T00:00:00.000Z'),
        kelasId: kelas.id,
        studentId: student.id,
        keterangan: 'Fixture E2E',
        fileName: 'e2e-letter.pdf',
        filePath,
        fileSize: 9,
        mimeType: 'application/pdf',
        uploadedById: admin.id,
      },
    });

    try {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/students/${student.id}`)
        .set('Cookie', adminCookies)
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(204);
      expect(fs.existsSync(filePath)).toBe(false);
      expect(await prisma.sickLetter.count({ where: { studentId: student.id } })).toBe(0);
    } finally {
      await prisma.sickLetter.deleteMany({ where: { studentId: student.id } });
      await prisma.student.deleteMany({ where: { id: student.id } });
      fs.rmSync(filePath, { force: true });
    }
  });

  it('menjaga agar selalu ada Admin aktif', async () => {
    const users = app.get(UsersService);
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin.test@smkn11jakarta.sch.id' },
    });

    await expect(users.update(admin.id, { status: ActiveStatus.inactive }))
      .rejects.toMatchObject({ status: 409 });
    await expect(users.update(admin.id, { role: Role.GURU_PIKET }))
      .rejects.toMatchObject({ status: 409 });
    await expect(users.remove(admin.id)).rejects.toMatchObject({ status: 409 });

    const secondAdmin = await prisma.user.create({
      data: {
        nama: 'Admin Kedua E2E',
        email: 'admin.second.test@smkn11jakarta.sch.id',
        passwordHash: 'test-only-hash',
        role: Role.ADMIN,
      },
    });
    await expect(users.update(admin.id, { role: Role.GURU_PIKET }))
      .resolves.toMatchObject({ role: Role.GURU_PIKET });
    await users.update(admin.id, { role: Role.ADMIN });
    await expect(users.remove(secondAdmin.id)).resolves.toMatchObject({ success: true });

    const racingAdmins = await Promise.all(['race-a', 'race-b'].map((suffix) => prisma.user.create({
      data: {
        nama: `Admin ${suffix} E2E`,
        email: `admin.${suffix}.test@smkn11jakarta.sch.id`,
        passwordHash: 'test-only-hash',
        role: Role.ADMIN,
      },
    })));
    try {
      await users.update(admin.id, { status: ActiveStatus.inactive });
      await Promise.allSettled(racingAdmins.map((racingAdmin) => users.remove(racingAdmin.id)));
      expect(await prisma.user.count({ where: { role: Role.ADMIN, status: ActiveStatus.active } })).toBeGreaterThanOrEqual(1);
    } finally {
      await prisma.user.update({ where: { id: admin.id }, data: { status: ActiveStatus.active } });
      await prisma.user.deleteMany({ where: { id: { in: racingAdmins.map((racingAdmin) => racingAdmin.id) } } });
    }
  });
});
