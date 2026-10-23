import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { SessionUser } from '../types/session-user.type';

/**
 * Memastikan aktor memiliki hak akses terhadap suatu kelas.
 * - ADMIN & GURU_PIKET: Memiliki akses ke seluruh kelas.
 * - KETUA_KELAS:
 *   - Wajib memiliki kelasId yang valid (jika null -> 403 Forbidden).
 *   - Hanya diizinkan mengakses kelas miliknya (jika kelasId target berbeda -> 403 Forbidden).
 * - Role lain / user undefined: Ditolak (403 Forbidden).
 */
export function assertClassAccess(
  user: SessionUser | undefined,
  kelasId: string | null | undefined,
): void {
  if (!user) {
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'Akses ditolak.',
    });
  }

  // Admin dan Guru Piket memiliki akses ke seluruh kelas
  if (user.role === Role.ADMIN || user.role === Role.GURU_PIKET) {
    return;
  }

  if (user.role === Role.KETUA_KELAS) {
    // Ketua kelas tanpa penugasan kelas ditolak
    if (!user.kelasId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Ketua kelas tidak memiliki penugasan kelas yang valid.',
      });
    }

    // Ketua kelas hanya boleh mengakses kelas miliknya sendiri
    if (kelasId && user.kelasId !== kelasId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Akses ditolak: Anda hanya dapat mengakses kelas Anda sendiri.',
      });
    }

    return;
  }

  throw new ForbiddenException({
    code: 'FORBIDDEN',
    message: 'Akses ditolak.',
  });
}
