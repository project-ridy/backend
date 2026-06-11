import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import type {
  RegisterVehicleInput,
  UpdateProfileInput,
  UpdateVehicleInput,
} from '../../graphql/generated/schema-types';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from './user.service';

type UserDelegate = {
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
};

type VehicleDelegate = {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

type MockPrisma = {
  user: UserDelegate;
  vehicle: VehicleDelegate;
};

const now = new Date('2026-01-01T00:00:00Z');

const mockCompany = {
  id: 'company-1',
  name: '테크스타터',
  inviteCode: 'TECH01',
  domain: 'techstarter.co.kr',
  plan: 'PRO',
  maxMembers: 50,
  createdAt: now,
  updatedAt: now,
  _count: { users: 10 },
};

const mockUser = {
  id: 'user-1',
  companyId: 'company-1',
  employeeId: 'E-001',
  email: 'user@techstarter.co.kr',
  name: '정원',
  phone: null,
  imageUrl: null,
  provider: 'KAKAO',
  providerId: 'kakao-1',
  role: 'PASSENGER',
  rating: 0,
  rideCount: 0,
  company: mockCompany,
  vehicles: [],
  createdAt: now,
  updatedAt: now,
};

const mockVehicle = {
  id: 'vehicle-1',
  userId: 'user-1',
  model: '아반떼',
  color: '흰색',
  plate: '12가3456',
  capacity: 4,
  createdAt: now,
};

describe('UserService', () => {
  let service: UserService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      vehicle: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('updateProfile', () => {
    it('프로필을 수정하고 User를 반환한다', async () => {
      const updated = { ...mockUser, name: '정원2', phone: '010-1234-5678' };
      prisma.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile('user-1', {
        name: '정원2',
        phone: '010-1234-5678',
      } as UpdateProfileInput);

      expect(result.name).toBe('정원2');
      expect(result.phone).toBe('010-1234-5678');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { name: '정원2', phone: '010-1234-5678', imageUrl: undefined },
        }),
      );
    });

    it('일부 필드만 수정할 수 있다', async () => {
      const updated = { ...mockUser, name: '정원3' };
      prisma.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile('user-1', { name: '정원3' } as UpdateProfileInput);

      expect(result.name).toBe('정원3');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: '정원3', phone: undefined, imageUrl: undefined },
        }),
      );
    });
  });

  describe('registerVehicle', () => {
    it('차량을 등록하고 Vehicle을 반환한다', async () => {
      prisma.vehicle.create.mockResolvedValue(mockVehicle);

      const result = await service.registerVehicle('user-1', {
        model: '아반떼',
        color: '흰색',
        plate: '12가3456',
        capacity: 4,
      });

      expect(result.model).toBe('아반떼');
      expect(prisma.vehicle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userId: 'user-1',
            model: '아반떼',
            color: '흰색',
            plate: '12가3456',
            capacity: 4,
          },
        }),
      );
    });

    it('차량 번호판이 빈 문자열이면 에러를 반환한다', async () => {
      await expect(
        service.registerVehicle('user-1', {
          model: '아반떼',
          plate: '',
          capacity: 4,
        } as RegisterVehicleInput),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateVehicle', () => {
    it('본인 차량을 수정하고 Vehicle을 반환한다', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(mockVehicle);
      const updated = { ...mockVehicle, color: '검정' };
      prisma.vehicle.update.mockResolvedValue(updated);

      const result = await service.updateVehicle('user-1', 'vehicle-1', {
        color: '검정',
      } as UpdateVehicleInput);

      expect(result.color).toBe('검정');
      expect(prisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vehicle-1' },
          data: { model: undefined, color: '검정', plate: undefined, capacity: undefined },
        }),
      );
    });

    it('다른 사용자의 차량이면 에러를 반환한다', async () => {
      prisma.vehicle.findUnique.mockResolvedValue({
        ...mockVehicle,
        userId: 'other-user',
      });

      await expect(
        service.updateVehicle('user-1', 'vehicle-1', {
          color: '검정',
        } as UpdateVehicleInput),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('존재하지 않는 차량이면 에러를 반환한다', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);

      await expect(
        service.updateVehicle('user-1', 'nonexistent', {
          color: '검정',
        } as UpdateVehicleInput),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteVehicle', () => {
    it('본인 차량을 삭제하고 true를 반환한다', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(mockVehicle);
      prisma.vehicle.delete.mockResolvedValue(mockVehicle);

      const result = await service.deleteVehicle('user-1', 'vehicle-1');

      expect(result).toBe(true);
      expect(prisma.vehicle.delete).toHaveBeenCalledWith({
        where: { id: 'vehicle-1' },
      });
    });

    it('다른 사용자의 차량이면 에러를 반환한다', async () => {
      prisma.vehicle.findUnique.mockResolvedValue({
        ...mockVehicle,
        userId: 'other-user',
      });

      await expect(service.deleteVehicle('user-1', 'vehicle-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('존재하지 않는 차량이면 에러를 반환한다', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);

      await expect(service.deleteVehicle('user-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('myVehicles', () => {
    it('본인 차량 목록을 반환한다', async () => {
      const vehicles = [mockVehicle];
      prisma.vehicle.findMany.mockResolvedValue(vehicles);

      const result = await service.myVehicles('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].model).toBe('아반떼');
      expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('차량이 없으면 빈 배열을 반환한다', async () => {
      prisma.vehicle.findMany.mockResolvedValue([]);

      const result = await service.myVehicles('user-1');

      expect(result).toHaveLength(0);
    });
  });
});
