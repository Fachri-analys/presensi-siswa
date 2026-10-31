import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(backendDir);
process.loadEnvFile(path.join(backendDir, '.env'));

if (process.env.NODE_ENV !== 'development' || process.env.DATABASE_URL !== 'file:./dev.db') {
  throw new Error('Seeder akun tes hanya boleh dijalankan untuk development dengan DATABASE_URL=file:./dev.db.');
}

const { PrismaClient, Role, ActiveStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');
const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
if (!Number.isInteger(rounds) || rounds < 10 || rounds > 15) {
  throw new Error('BCRYPT_ROUNDS harus berupa bilangan bulat antara 10 dan 15.');
}

const accounts = [
  { prefix: 'LOCAL_TEST_ADMIN', role: Role.ADMIN, name: 'Admin Lokal' },
  { prefix: 'LOCAL_TEST_GURU', role: Role.GURU_PIKET, name: 'Guru Piket Lokal' },
  { prefix: 'LOCAL_TEST_KETUA', role: Role.KETUA_KELAS, name: 'Ketua Kelas Lokal' },
].map(({ prefix, ...account }) => {
  const email = process.env[`${prefix}_EMAIL`]?.trim().toLowerCase();
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
    throw new Error(`Isi ${prefix}_EMAIL dan ${prefix}_PASSWORD di backend/.env.`);
  }
  const groups = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  if (password.length < 24 || Buffer.byteLength(password, 'utf8') > 72 || groups < 3) {
    throw new Error(`${prefix}_PASSWORD harus minimal 24 karakter, memakai 3 jenis karakter, dan maksimal 72 byte UTF-8.`);
  }
  return { ...account, email, password };
});

const prisma = new PrismaClient();
const localClassName = 'KELAS UJI LOKAL';

async function main() {
  await prisma.$transaction(async (tx) => {
    const localClass = await tx.class.upsert({
      where: { nama: localClassName },
      update: {},
      create: { nama: localClassName, jurusan: 'Data pengujian lokal', status: ActiveStatus.active },
    });

    for (const account of accounts) {
      const existing = await tx.user.findUnique({ where: { email: account.email } });
      if (existing) {
        if (
          existing.role !== account.role ||
          existing.status !== ActiveStatus.active ||
          !(await bcrypt.compare(account.password, existing.passwordHash)) ||
          (account.role === Role.KETUA_KELAS && existing.kelasId !== localClass.id)
        ) {
          throw new Error(`Akun ${account.email} sudah ada tetapi role/password/kelas tidak cocok. Tidak ada perubahan dibuat.`);
        }
        console.log(`${account.role}: sudah ada; tidak diubah.`);
        continue;
      }

      await tx.user.create({
        data: {
          email: account.email,
          nama: account.name,
          passwordHash: await bcrypt.hash(account.password, rounds),
          role: account.role,
          status: ActiveStatus.active,
          ...(account.role === Role.KETUA_KELAS ? { kelasId: localClass.id } : {}),
        },
      });
      console.log(`${account.role}: dibuat (${account.email}).`);
    }
  });
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
