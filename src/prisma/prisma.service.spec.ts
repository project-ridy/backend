import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await service.$disconnect();
  });

  it('서비스가 정의되어야 함', () => {
    expect(service).toBeDefined();
  });

  it('PrismaClient 메서드에 접근 가능해야 함', () => {
    expect(service.company).toBeDefined();
    expect(service.user).toBeDefined();
    expect(service.ride).toBeDefined();
    expect(service.inviteCode).toBeDefined();
    expect(service.vehicle).toBeDefined();
    expect(service.rideRequest).toBeDefined();
    expect(service.review).toBeDefined();
    expect(service.settlement).toBeDefined();
    expect(service.paymentMethod).toBeDefined();
    expect(service.chatRoom).toBeDefined();
    expect(service.message).toBeDefined();
  });

  it('onModuleDestroy 호출 시 $disconnect가 호출되어야 함', async () => {
    const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalled();
    disconnectSpy.mockRestore();
  });
});
