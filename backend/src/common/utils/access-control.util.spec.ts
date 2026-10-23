import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { assertClassAccess } from './access-control.util';
import type { SessionUser } from '../types/session-user.type';

describe('assertClassAccess', () => {
  it('mengizinkan Admin mengakses kelas manapun', () => {
    const admin: SessionUser = {
      id: 'admin-1',
      email: 'admin@school.com',
      nama: 'Admin',
      role: Role.ADMIN,
      kelasId: null,
    };
    expect(() => assertClassAccess(admin, 'any-class-id')).not.toThrow();
  });

  it('mengizinkan Guru Piket mengakses kelas manapun', () => {
    const guru: SessionUser = {
      id: 'guru-1',
      email: 'guru@school.com',
      nama: 'Guru Piket',
      role: Role.GURU_PIKET,
      kelasId: null,
    };
    expect(() => assertClassAccess(guru, 'any-class-id')).not.toThrow();
  });

  it('mengizinkan Ketua Kelas mengakses kelas miliknya sendiri', () => {
    const ketua: SessionUser = {
      id: 'ketua-1',
      email: 'ketua@school.com',
      nama: 'Ketua',
      role: Role.KETUA_KELAS,
      kelasId: 'cls-10-pplg-1',
    };
    expect(() => assertClassAccess(ketua, 'cls-10-pplg-1')).not.toThrow();
  });

  it('menolak Ketua Kelas tanpa kelasId (403 Forbidden)', () => {
    const ketuaNull: SessionUser = {
      id: 'ketua-null',
      email: 'ketua.null@school.com',
      nama: 'Ketua Null',
      role: Role.KETUA_KELAS,
      kelasId: null,
    };
    expect(() => assertClassAccess(ketuaNull, 'cls-10-pplg-1')).toThrow(ForbiddenException);
    expect(() => assertClassAccess(ketuaNull, null)).toThrow(ForbiddenException);
  });

  it('menolak Ketua Kelas yang mengakses kelas berbeda (403 Forbidden)', () => {
    const ketua: SessionUser = {
      id: 'ketua-1',
      email: 'ketua@school.com',
      nama: 'Ketua',
      role: Role.KETUA_KELAS,
      kelasId: 'cls-10-pplg-1',
    };
    expect(() => assertClassAccess(ketua, 'cls-11-pplg-1')).toThrow(ForbiddenException);
  });

  it('menolak jika user undefined (403 Forbidden)', () => {
    expect(() => assertClassAccess(undefined, 'cls-1')).toThrow(ForbiddenException);
  });
});
