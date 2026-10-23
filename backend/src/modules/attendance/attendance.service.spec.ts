import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { ActiveStatus, AttendanceSession, AttendanceStatus, Role } from '@prisma/client';

// Default mock nowWibTime ke jam 08:00 (dalam window sesi PAGI default)
const mockNowWibTime = jest.fn().mockReturnValue('08:00');
jest.mock('../../common/utils/time.util', () => ({
  ...jest.requireActual('../../common/utils/time.util'),
  nowWibTime: (...args: any[]) => mockNowWibTime(...args),
}));

describe('AttendanceService (Batch Presensi, Transaksi, N+1, IDOR)', () => {
  let service: AttendanceService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jest.fn((cb) => {
        if (typeof cb === 'function') {
          return cb(mockPrisma);
        }
        return Promise.all(cb);
      }),
      attendance: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      schedule: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      attendancePermission: {
        findFirst: jest.fn(),
      },
      student: {
        findMany: jest.fn(),
      },
      class: {
        findUnique: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  // [ATT-01] Batch attendance simpan data presensi atomik
  it('[ATT-01] saveBatch() menyimpan daftar presensi dengan pemetaan NIS siswa', async () => {
    const user = {
      id: 'usr-guru',
      email: 'guru@test.com',
      nama: 'Guru Piket',
      role: Role.GURU_PIKET,
      kelasId: null,
    };

    mockPrisma.student.findMany.mockResolvedValueOnce([
      { id: 'std-1', nis: '241101' },
      { id: 'std-2', nis: '241102' },
    ]);

    mockPrisma.attendance.upsert
      .mockResolvedValueOnce({
        id: 'att-1',
        kelasId: 'cls-1',
        studentId: 'std-1',
        status: AttendanceStatus.HADIR,
        waktu: '07:15',
        keterangan: '',
        createdById: 'usr-guru',
        updatedById: 'usr-guru',
        updatedAt: new Date(),
        student: { nis: '241101', nama: 'Ahmad' },
      })
      .mockResolvedValueOnce({
        id: 'att-2',
        kelasId: 'cls-1',
        studentId: 'std-2',
        status: AttendanceStatus.SAKIT,
        waktu: null,
        keterangan: 'Demam',
        createdById: 'usr-guru',
        updatedById: 'usr-guru',
        updatedAt: new Date(),
        student: { nis: '241102', nama: 'Budi' },
      });

    const result = await service.saveBatch(
      {
        date: '2026-10-16',
        kelasId: 'cls-1',
        records: [
          { nis: '241101', status: AttendanceStatus.HADIR, waktu: '07:15' },
          { nis: '241102', status: AttendanceStatus.SAKIT, keterangan: 'Demam' },
        ],
      },
      user,
    );

    expect(result.length).toBe(2);
    expect(mockPrisma.attendance.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });

  // [SEC-IDOR-02] KETUA_KELAS dilarang mencatat presensi untuk kelas lain
  it('[SEC-IDOR-02] saveBatch() melempar ForbiddenException jika Ketua Kelas mengisi kelas lain', async () => {
    const ketuaUser = {
      id: 'usr-ketua',
      email: 'ketua@test.com',
      nama: 'Ketua Kelas',
      role: Role.KETUA_KELAS,
      kelasId: 'cls-own',
    };

    await expect(
      service.saveBatch(
        {
          date: '2026-10-16',
          kelasId: 'cls-other', // Berbeda dari cls-own
          records: [{ nis: '241101', status: AttendanceStatus.HADIR }],
        },
        ketuaUser,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // [ATT-03] Penguncian sesi menolak pengisian oleh Ketua Kelas
  it('[ATT-03] saveBatch() menolak jika sesi terkunci dan tidak ada izin khusus', async () => {
    const ketuaUser = {
      id: 'usr-ketua',
      email: 'ketua@test.com',
      nama: 'Ketua Kelas',
      role: Role.KETUA_KELAS,
      kelasId: 'cls-own',
    };

    // Stub nowWibTime agar dalam window sesi (sehingga time-window check lolos,
    // hanya terkunci yang diuji)
    mockNowWibTime.mockReturnValue('08:00');

    mockPrisma.schedule.findMany.mockResolvedValueOnce([
      { session: AttendanceSession.PAGI, mulai: '07:00', selesai: '12:00', terkunci: true },
    ]);
    mockPrisma.attendancePermission.findFirst.mockResolvedValueOnce(null); // Tidak ada izin

    await expect(
      service.saveBatch(
        {
          date: '2026-10-16',
          kelasId: 'cls-own',
          records: [{ nis: '241101', status: AttendanceStatus.HADIR }],
        },
        ketuaUser,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // [B3-01] Ketua Kelas dilarang mencatat HADIR/TERLAMBAT di luar window sesi
  it('[B3-01] saveBatch() menolak HADIR/TERLAMBAT dari Ketua Kelas di luar window sesi', async () => {
    const ketuaUser = {
      id: 'usr-ketua',
      email: 'ketua@test.com',
      nama: 'Ketua Kelas',
      role: Role.KETUA_KELAS,
      kelasId: 'cls-own',
    };

    // Jam saat ini di luar window (sesi PAGI 07:00-12:00, SIANG 13:00-15:00, sekarang 17:00)
    mockNowWibTime.mockReturnValue('17:00');

    mockPrisma.schedule.findMany.mockResolvedValueOnce([
      { session: AttendanceSession.PAGI, mulai: '07:00', selesai: '12:00', terkunci: false },
      { session: AttendanceSession.SIANG, mulai: '13:00', selesai: '15:00', terkunci: false },
    ]);
    mockPrisma.attendancePermission.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.saveBatch(
        {
          date: '2026-10-16',
          kelasId: 'cls-own',
          records: [{ nis: '241101', status: AttendanceStatus.HADIR }],
        },
        ketuaUser,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // [B3-02] Ketua Kelas boleh mencatat IZIN/SAKIT/ALPA di luar window sesi
  it('[B3-02] saveBatch() mengizinkan IZIN/SAKIT/ALPA dari Ketua Kelas di luar window sesi', async () => {
    const ketuaUser = {
      id: 'usr-ketua',
      email: 'ketua@test.com',
      nama: 'Ketua Kelas',
      role: Role.KETUA_KELAS,
      kelasId: 'cls-own',
    };

    mockNowWibTime.mockReturnValue('17:00');

    mockPrisma.schedule.findMany.mockResolvedValueOnce([
      { session: AttendanceSession.PAGI, mulai: '07:00', selesai: '12:00', terkunci: false },
    ]);

    mockPrisma.student.findMany.mockResolvedValueOnce([
      { id: 'std-1', nis: '241101' },
    ]);

    mockPrisma.attendance.upsert.mockResolvedValueOnce({
      id: 'att-1',
      kelasId: 'cls-own',
      studentId: 'std-1',
      status: AttendanceStatus.SAKIT,
      waktu: null,
      keterangan: 'Demam',
      createdById: 'usr-ketua',
      updatedById: 'usr-ketua',
      updatedAt: new Date(),
      student: { nis: '241101', nama: 'Ahmad' },
    });

    const result = await service.saveBatch(
      {
        date: '2026-10-16',
        kelasId: 'cls-own',
        records: [{ nis: '241101', status: AttendanceStatus.SAKIT, keterangan: 'Demam' }],
      },
      ketuaUser,
    );

    expect(result.length).toBe(1);
    expect(result[0].status).toBe(AttendanceStatus.SAKIT);
  });

  // [B3-03] Ketua Kelas boleh mencatat HADIR dalam window sesi yang terbuka
  it('[B3-03] saveBatch() mengizinkan HADIR dari Ketua Kelas dalam window sesi terbuka', async () => {
    const ketuaUser = {
      id: 'usr-ketua',
      email: 'ketua@test.com',
      nama: 'Ketua Kelas',
      role: Role.KETUA_KELAS,
      kelasId: 'cls-own',
    };

    mockNowWibTime.mockReturnValue('08:30');

    mockPrisma.schedule.findMany.mockResolvedValueOnce([
      { session: AttendanceSession.PAGI, mulai: '07:00', selesai: '12:00', terkunci: false },
    ]);

    mockPrisma.student.findMany.mockResolvedValueOnce([
      { id: 'std-1', nis: '241101' },
    ]);

    mockPrisma.attendance.upsert.mockResolvedValueOnce({
      id: 'att-1',
      kelasId: 'cls-own',
      studentId: 'std-1',
      status: AttendanceStatus.HADIR,
      waktu: '08:30',
      keterangan: '',
      createdById: 'usr-ketua',
      updatedById: 'usr-ketua',
      updatedAt: new Date(),
      student: { nis: '241101', nama: 'Ahmad' },
    });

    const result = await service.saveBatch(
      {
        date: '2026-10-16',
        kelasId: 'cls-own',
        records: [{ nis: '241101', status: AttendanceStatus.HADIR, waktu: '08:30' }],
      },
      ketuaUser,
    );

    expect(result.length).toBe(1);
    expect(result[0].status).toBe(AttendanceStatus.HADIR);
  });

  // [B3-04] Guru Piket/Admin tidak terikat batasan window sesi
  it('[B3-04] saveBatch() mengizinkan HADIR dari Guru Piket meskipun di luar window sesi', async () => {
    const guruUser = {
      id: 'usr-guru',
      email: 'guru@test.com',
      nama: 'Guru Piket',
      role: Role.GURU_PIKET,
      kelasId: null,
    };

    // Tidak perlu mock schedule karena Guru Piket tidak dicek window-nya
    mockPrisma.student.findMany.mockResolvedValueOnce([
      { id: 'std-1', nis: '241101' },
    ]);

    mockPrisma.attendance.upsert.mockResolvedValueOnce({
      id: 'att-1',
      kelasId: 'cls-1',
      studentId: 'std-1',
      status: AttendanceStatus.HADIR,
      waktu: '17:00',
      keterangan: '',
      createdById: 'usr-guru',
      updatedById: 'usr-guru',
      updatedAt: new Date(),
      student: { nis: '241101', nama: 'Ahmad' },
    });

    const result = await service.saveBatch(
      {
        date: '2026-10-16',
        kelasId: 'cls-1',
        records: [{ nis: '241101', status: AttendanceStatus.HADIR, waktu: '17:00' }],
      },
      guruUser,
    );

    expect(result.length).toBe(1);
  });

  // [PERF-N1-03] Rekap semester menggunakan agregasi groupBy dalam query konstan
  it('[PERF-N1-03] getRecap() mengagregasi kehadiran per siswa menggunakan groupBy tanpa N+1 query', async () => {
    const user = {
      id: 'usr-guru',
      email: 'guru@test.com',
      nama: 'Guru Piket',
      role: Role.GURU_PIKET,
      kelasId: null,
    };

    mockPrisma.class.findUnique.mockResolvedValueOnce({
      id: 'cls-1',
      nama: 'XI PPLG 1',
      jurusan: 'PPLG',
      status: ActiveStatus.active,
      leader: null,
    });

    mockPrisma.student.findMany.mockResolvedValueOnce([
      { id: 'std-1', nis: '241101', nama: 'Ahmad' },
      { id: 'std-2', nis: '241102', nama: 'Budi' },
    ]);

    mockPrisma.attendance.groupBy.mockResolvedValueOnce([
      { studentId: 'std-1', status: AttendanceStatus.HADIR, _count: { status: 18 } },
      { studentId: 'std-1', status: AttendanceStatus.TERLAMBAT, _count: { status: 2 } },
      { studentId: 'std-2', status: AttendanceStatus.HADIR, _count: { status: 15 } },
      { studentId: 'std-2', status: AttendanceStatus.SAKIT, _count: { status: 5 } },
    ]);

    mockPrisma.attendance.findMany.mockResolvedValueOnce([
      { date: new Date('2026-10-01') },
      { date: new Date('2026-10-02') },
    ]);

    const recap = await service.getRecap({ kelasId: 'cls-1' }, user);
    expect(recap.rows.length).toBe(2);
    expect(recap.effectiveDays).toBe(2);
    expect(recap.rows[0].hadir).toBe(20); // 18 Hadir + 2 Terlambat
    expect(recap.rows[0].terlambat).toBe(2);
    expect(recap.kelas.active).toBe(true);
    expect(recap).toHaveProperty('from');
    expect(recap).toHaveProperty('to');

    // Pastikan dipanggil menggunakan agregasi groupBy, bukan looping individual query
    expect(mockPrisma.attendance.groupBy).toHaveBeenCalledTimes(1);
  });
});
