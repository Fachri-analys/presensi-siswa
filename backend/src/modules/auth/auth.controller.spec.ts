import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request, Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: { login: jest.Mock; logout: jest.Mock };

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('login() harus memanggil authService.login dan menyetel cookie', async () => {
    const mockUser = {
      id: 'usr-1',
      email: 'admin@smkn11jakarta.sch.id',
      nama: 'Admin Sekolah',
      role: Role.ADMIN,
      kelasId: null,
    };
    const expiresAt = new Date(Date.now() + 3600000);
    mockAuthService.login.mockResolvedValueOnce({
      token: 'mock-session-token',
      user: mockUser,
      expiresAt,
    });

    const mockReq = {
      headers: { 'user-agent': 'Jest' },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const mockRes = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;

    const result = await controller.login(
      { email: 'admin@smkn11jakarta.sch.id', password: 'Admin#2026' },
      mockReq,
      mockRes,
    );

    expect(result).toEqual(mockUser);
    expect(mockAuthService.login).toHaveBeenCalledWith(
      { email: 'admin@smkn11jakarta.sch.id', password: 'Admin#2026' },
      'Jest',
      '127.0.0.1',
    );
    expect(mockRes.cookie).toHaveBeenCalled();
  });

  it('logout() harus memanggil authService.logout dan menghapus cookie', async () => {
    mockAuthService.logout.mockResolvedValueOnce(undefined);

    const mockReq = {
      cookies: { presensi_session: 'mock-token' },
    } as unknown as Request;

    const mockRes = {
      clearCookie: jest.fn(),
    } as unknown as Response;

    await controller.logout(mockReq, mockRes);

    expect(mockAuthService.logout).toHaveBeenCalledWith('mock-token');
    expect(mockRes.clearCookie).toHaveBeenCalled();
  });

  it('me() mengembalikan session user jika ada', () => {
    const user = {
      id: 'usr-1',
      email: 'test@example.com',
      nama: 'Test',
      role: Role.ADMIN,
      kelasId: null,
    };
    expect(controller.me(user)).toEqual(user);
  });

  it('me() melempar UnauthorizedException jika session user undefined', () => {
    expect(() => controller.me(undefined)).toThrow(UnauthorizedException);
  });
});
