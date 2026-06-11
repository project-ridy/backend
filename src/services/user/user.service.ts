import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Vehicle } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import type {
  RegisterVehicleInput,
  UpdateProfileInput,
  UpdateVehicleInput,
} from '../../graphql/generated/schema-types';

/** InputMaybe<T>의 null → undefined 변환 */
function unwrap<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

@Injectable()
export class UserService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async updateProfile(userId: string, input: UpdateProfileInput) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: unwrap(input.name),
        phone: unwrap(input.phone),
        imageUrl: unwrap(input.imageUrl),
      },
      include: {
        company: { include: { _count: { select: { users: true } } } },
        vehicles: true,
      },
    });
  }

  async registerVehicle(userId: string, input: RegisterVehicleInput): Promise<Vehicle> {
    if (!input.plate || input.plate.trim().length === 0) {
      throw new BadRequestException('차량 번호판은 필수입니다');
    }

    return this.prisma.vehicle.create({
      data: {
        userId,
        model: input.model,
        color: unwrap(input.color) ?? null,
        plate: input.plate,
        capacity: unwrap(input.capacity) ?? 4,
      },
    });
  }

  async updateVehicle(
    userId: string,
    vehicleId: string,
    input: UpdateVehicleInput,
  ): Promise<Vehicle> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('차량을 찾을 수 없습니다');
    }
    if (vehicle.userId !== userId) {
      throw new UnauthorizedException('본인의 차량만 수정할 수 있습니다');
    }

    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        model: unwrap(input.model),
        color: unwrap(input.color),
        plate: unwrap(input.plate),
        capacity: unwrap(input.capacity),
      },
    });
  }

  async deleteVehicle(userId: string, vehicleId: string): Promise<boolean> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('차량을 찾을 수 없습니다');
    }
    if (vehicle.userId !== userId) {
      throw new UnauthorizedException('본인의 차량만 삭제할 수 있습니다');
    }

    await this.prisma.vehicle.delete({ where: { id: vehicleId } });
    return true;
  }

  async myVehicles(userId: string): Promise<Vehicle[]> {
    return this.prisma.vehicle.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
