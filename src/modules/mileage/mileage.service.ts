import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMileageUpdateDto } from './dto/create-mileage-update.dto';

@Injectable()
export class MileageService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCar(userId: string, carId: string) {
    await this.ensureOwnedCar(userId, carId);
    const updates = await this.prisma.mileageUpdate.findMany({
      where: { carId },
      orderBy: { date: 'desc' },
    });
    return { data: updates };
  }

  async createForOwnedCar(userId: string, carId: string, dto: CreateMileageUpdateDto) {
    const car = await this.ensureOwnedCar(userId, carId);
    if (dto.mileage < car.currentMileage) {
      throw new BadRequestException('Le kilometrage ne peut pas etre inferieur au kilometrage actuel.');
    }

    const update = await this.prisma.mileageUpdate.create({
      data: {
        carId,
        mileage: dto.mileage,
        date: new Date(dto.date),
        source: dto.source ?? 'manual',
      },
    });

    if (dto.mileage > car.currentMileage) {
      await this.prisma.car.update({
        where: { id: carId },
        data: { currentMileage: dto.mileage },
      });
    }

    return { data: update, message: 'Kilometrage enregistre.' };
  }

  private async ensureOwnedCar(userId: string, carId: string) {
    const car = await this.prisma.car.findFirst({ where: { id: carId, userId } });
    if (!car) {
      throw new NotFoundException('Vehicule introuvable.');
    }
    return car;
  }
}
