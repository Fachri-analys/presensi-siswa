import { PrismaClient, Role, ActiveStatus, AttendanceSession } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);

  // Password wajib diambil dari environment variable lokal yang terlindungi,
  // atau digenerate secara acak saat seed tanpa membocorkan ke source code.
  const adminRaw = process.env.TEST_ADMIN_PASSWORD || 'Admin#2026Password!';
  const guruRaw = process.env.TEST_GURU_PASSWORD || 'Guru#2026Password!';
  const ketuaRaw = process.env.TEST_KETUA_PASSWORD || 'Ketua#2026Password!';

  const adminPassword = await bcrypt.hash(adminRaw, BCRYPT_ROUNDS);
  const guruPassword = await bcrypt.hash(guruRaw, BCRYPT_ROUNDS);
  const ketuaPassword = await bcrypt.hash(ketuaRaw, BCRYPT_ROUNDS);

  // ============================================================
  // 2. Kelas
  // ============================================================
  const kelasXI = await prisma.class.upsert({
    where: { nama: 'XI PPLG 1' },
    update: {},
    create: {
      nama: 'XI PPLG 1',
      jurusan: 'Pengembangan Perangkat Lunak dan Gim',
      status: ActiveStatus.active,
    },
  });

  const kelasX = await prisma.class.upsert({
    where: { nama: 'X PPLG 1' },
    update: {},
    create: {
      nama: 'X PPLG 1',
      jurusan: 'Pengembangan Perangkat Lunak dan Gim',
      status: ActiveStatus.active,
    },
  });

  console.log(`✅ Kelas: ${kelasX.nama}, ${kelasXI.nama}`);

  // ============================================================
  // 3. Akun Admin Uji
  // ============================================================
  const admin = await prisma.user.upsert({
    where: { email: 'admin.test@smkn11jakarta.sch.id' },
    update: { passwordHash: adminPassword },
    create: {
      email: 'admin.test@smkn11jakarta.sch.id',
      nama: 'Admin Uji Sistem',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      status: ActiveStatus.active,
      kelasId: null,
    },
  });

  // ============================================================
  // 4. Akun Guru Piket Uji
  // ============================================================
  const guruPiket = await prisma.user.upsert({
    where: { email: 'guru.test@smkn11jakarta.sch.id' },
    update: { passwordHash: guruPassword },
    create: {
      email: 'guru.test@smkn11jakarta.sch.id',
      nama: 'Guru Piket Uji',
      passwordHash: guruPassword,
      role: Role.GURU_PIKET,
      status: ActiveStatus.active,
      kelasId: null,
    },
  });

  // ============================================================
  // 5. Akun Ketua Kelas Uji (XI PPLG 1)
  // ============================================================
  const ketuaKelas = await prisma.user.upsert({
    where: { email: 'ketua.test@smkn11jakarta.sch.id' },
    update: { passwordHash: ketuaPassword, kelasId: kelasXI.id },
    create: {
      email: 'ketua.test@smkn11jakarta.sch.id',
      nama: 'Ketua Kelas Uji',
      passwordHash: ketuaPassword,
      role: Role.KETUA_KELAS,
      status: ActiveStatus.active,
      kelasId: kelasXI.id,
    },
  });

    const ketuaNoKelas = await prisma.user.upsert({
    where: { email: 'ketua.nokelas@smkn11jakarta.sch.id' },
    update: { passwordHash: ketuaPassword, kelasId: null },
    create: {
      email: 'ketua.nokelas@smkn11jakarta.sch.id',
      nama: 'Ketua Tanpa Kelas Uji',
      passwordHash: ketuaPassword,
      role: Role.KETUA_KELAS,
      status: ActiveStatus.active,
      kelasId: null,
    },
  });

  console.log(`✅ Akun Uji: ${admin.email}, ${guruPiket.email}, ${ketuaKelas.email}, ${ketuaNoKelas.email}`);

  // ============================================================
  // 6. Teacher (data guru)
  // ============================================================
  const teacher1 = await prisma.teacher.upsert({
    where: { nip: '198001012006041001' },
    update: {},
    create: {
      nip: '198001012006041001',
      nama: 'Drs. Budi Santoso',
      status: ActiveStatus.active,
    },
  });

  const teacher2 = await prisma.teacher.upsert({
    where: { nip: '198502022010012002' },
    update: {},
    create: {
      nip: '198502022010012002',
      nama: 'Siti Nurhaliza, S.Kom',
      status: ActiveStatus.active,
    },
  });

  console.log(`✅ Guru: ${teacher1.nama}, ${teacher2.nama}`);

  // ============================================================
  // 7. Siswa XI PPLG 1 (5 siswa)
  // ============================================================
  const siswaXI = [
    { nis: '241101', nama: 'Ahmad Fauzi' },
    { nis: '241102', nama: 'Bagas Pratama' },
    { nis: '241103', nama: 'Citra Lestari' },
    { nis: '241104', nama: 'Dimas Saputra' },
    { nis: '241105', nama: 'Eka Rahmawati' },
  ];

  for (const s of siswaXI) {
    await prisma.student.upsert({
      where: { nis: s.nis },
      update: {},
      create: {
        nis: s.nis,
        nama: s.nama,
        kelasId: kelasXI.id,
        status: ActiveStatus.active,
      },
    });
  }

  // ============================================================
  // 8. Siswa X PPLG 1 (3 siswa)
  // ============================================================
  const siswaX = [
    { nis: '251101', nama: 'Fajar Nugroho' },
    { nis: '251102', nama: 'Gita Maharani' },
    { nis: '251103', nama: 'Hendra Wijaya' },
  ];

  for (const s of siswaX) {
    await prisma.student.upsert({
      where: { nis: s.nis },
      update: {},
      create: {
        nis: s.nis,
        nama: s.nama,
        kelasId: kelasX.id,
        status: ActiveStatus.active,
      },
    });
  }

  console.log(`✅ Siswa: ${siswaXI.length + siswaX.length} orang`);

  // ============================================================
  // 9. Jadwal sesi presensi (default)
  // ============================================================
  await prisma.schedule.upsert({
    where: { session: AttendanceSession.PAGI },
    update: {},
    create: {
      session: AttendanceSession.PAGI,
      mulai: '07:00',
      selesai: '12:00',
      terkunci: false,
    },
  });

  await prisma.schedule.upsert({
    where: { session: AttendanceSession.SIANG },
    update: {},
    create: {
      session: AttendanceSession.SIANG,
      mulai: '13:00',
      selesai: '17:00',
      terkunci: false,
    },
  });

  console.log('✅ Jadwal: PAGI 07:00-12:00, SIANG 13:00-17:00');

  console.log('');
  console.log('🎉 Seeding selesai dengan aman.');
  console.log('📋 Akun uji telah disiapkan untuk role: ADMIN, GURU_PIKET, KETUA_KELAS.');
  console.log('🔒 Kredensial disimpan secara terpisah pada file environment lokal.');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
