import { PrismaClient, AttendanceSession, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (Boolean(email) !== Boolean(password)) {
    throw new Error('Isi INITIAL_ADMIN_EMAIL dan INITIAL_ADMIN_PASSWORD bersama-sama untuk membuat Admin pertama.');
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('INITIAL_ADMIN_EMAIL harus berisi alamat email yang valid.');
  }
  if (password && password.length < 12) {
    throw new Error('INITIAL_ADMIN_PASSWORD minimal 12 karakter.');
  }
  if (password && Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('INITIAL_ADMIN_PASSWORD maksimal 72 byte UTF-8.');
  }

  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  if (!Number.isInteger(rounds) || rounds < 10 || rounds > 15) {
    throw new Error('BCRYPT_ROUNDS harus berupa bilangan bulat antara 10 dan 15.');
  }

  await prisma.schedule.upsert({
    where: { session: AttendanceSession.PAGI },
    update: {},
    create: { session: AttendanceSession.PAGI, mulai: '07:00', selesai: '12:00' },
  });
  await prisma.schedule.upsert({
    where: { session: AttendanceSession.SIANG },
    update: {},
    create: { session: AttendanceSession.SIANG, mulai: '13:00', selesai: '17:00' },
  });

  if (email && password) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.role !== Role.ADMIN) {
      throw new Error('INITIAL_ADMIN_EMAIL sudah dipakai akun yang bukan Admin.');
    }
    if (!existing) {
      await prisma.user.create({
        data: {
          email,
          nama: 'Admin Sekolah',
          role: Role.ADMIN,
          passwordHash: await bcrypt.hash(password, rounds),
        },
      });
      console.log('Admin pertama berhasil dibuat.');
    } else {
      console.log('Admin pertama sudah ada; kredensial yang tersimpan tidak diubah.');
    }
  } else {
    console.log('Jadwal presensi disiapkan. Admin pertama tidak dibuat karena variabel INITIAL_ADMIN_* belum diisi.');
  }
}

main()
  .catch((error) => {
    console.error('Seed gagal:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
