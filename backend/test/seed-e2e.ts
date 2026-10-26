import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const databaseUrl = process.env.DATABASE_URL;
const adminPassword = process.env.TEST_ADMIN_PASSWORD;
const guruPassword = process.env.TEST_GURU_PASSWORD;
const ketuaPassword = process.env.TEST_KETUA_PASSWORD;

if (process.env.NODE_ENV !== 'test' || !databaseUrl || new URL(databaseUrl).pathname !== '/presensi_test') {
  throw new Error('Fixture E2E hanya boleh dijalankan pada database presensi_test dengan NODE_ENV=test.');
}
if (!adminPassword || adminPassword.length < 12 || !guruPassword || guruPassword.length < 12 || !ketuaPassword || ketuaPassword.length < 12) {
  throw new Error('TEST_ADMIN_PASSWORD, TEST_GURU_PASSWORD, dan TEST_KETUA_PASSWORD wajib diisi minimal 12 karakter.');
}

const prisma = new PrismaClient();

async function main() {
  if (!adminPassword || !guruPassword || !ketuaPassword) {
    throw new Error('TEST_ADMIN_PASSWORD, TEST_GURU_PASSWORD, dan TEST_KETUA_PASSWORD wajib diisi minimal 12 karakter.');
  }

  const kelasA = await prisma.class.upsert({
    where: { nama: 'E2E Kelas A' },
    update: { jurusan: 'E2E' },
    create: { nama: 'E2E Kelas A', jurusan: 'E2E' },
  });
  const kelasB = await prisma.class.upsert({
    where: { nama: 'E2E Kelas B' },
    update: { jurusan: 'E2E' },
    create: { nama: 'E2E Kelas B', jurusan: 'E2E' },
  });

  const adminHash = await bcrypt.hash(adminPassword, 10);
  const guruHash = await bcrypt.hash(guruPassword, 10);
  const ketuaHash = await bcrypt.hash(ketuaPassword, 10);
  await prisma.user.upsert({
    where: { email: 'admin.test@smkn11jakarta.sch.id' },
    update: { passwordHash: adminHash, role: Role.ADMIN, status: 'active', kelasId: null },
    create: {
      nama: 'Admin E2E',
      email: 'admin.test@smkn11jakarta.sch.id',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });
  await prisma.user.upsert({
    where: { email: 'guru.test@smkn11jakarta.sch.id' },
    update: { passwordHash: guruHash, role: Role.GURU_PIKET, status: 'active', kelasId: null },
    create: {
      nama: 'Guru Piket E2E',
      email: 'guru.test@smkn11jakarta.sch.id',
      passwordHash: guruHash,
      role: Role.GURU_PIKET,
    },
  });
  await prisma.user.upsert({
    where: { email: 'ketua.test@smkn11jakarta.sch.id' },
    update: { passwordHash: ketuaHash, role: Role.KETUA_KELAS, status: 'active', kelasId: kelasA.id },
    create: {
      nama: 'Ketua E2E',
      email: 'ketua.test@smkn11jakarta.sch.id',
      passwordHash: ketuaHash,
      role: Role.KETUA_KELAS,
      kelasId: kelasA.id,
    },
  });
  await prisma.user.upsert({
    where: { email: 'ketua.nokelas@smkn11jakarta.sch.id' },
    update: { passwordHash: ketuaHash, role: Role.KETUA_KELAS, status: 'active', kelasId: null },
    create: {
      nama: 'Ketua Tanpa Kelas E2E',
      email: 'ketua.nokelas@smkn11jakarta.sch.id',
      passwordHash: ketuaHash,
      role: Role.KETUA_KELAS,
    },
  });
  await prisma.student.upsert({
    where: { nis: 'e2e-student-kelas-b' },
    update: { nama: 'Siswa Kelas B E2E', kelasId: kelasB.id, status: 'active' },
    create: { nis: 'e2e-student-kelas-b', nama: 'Siswa Kelas B E2E', kelasId: kelasB.id },
  });
}

main()
  .catch((error) => {
    console.error('Fixture E2E gagal:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
