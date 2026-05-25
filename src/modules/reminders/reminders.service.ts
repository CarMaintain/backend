import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReminderSettingDto } from './dto/create-reminder-setting.dto';
import { ReminderTargetTypeDto } from './dto/reminder.enums';
import { UpdateReminderSettingDto } from './dto/update-reminder-setting.dto';

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCar(userId: string, carId: string) {
    await this.ensureOwnedCar(userId, carId);
    const settings = await this.prisma.reminderSetting.findMany({
      where: { carId },
      orderBy: { createdAt: 'desc' },
    });
    return { data: settings };
  }

  async create(userId: string, dto: CreateReminderSettingDto) {
    await this.ensureOwnedCar(userId, dto.carId);
    await this.ensureTargetBelongsToCar(dto.carId, dto.targetType, dto.targetId);

    const setting = await this.prisma.reminderSetting.create({
      data: {
        carId: dto.carId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        daysBefore: dto.daysBefore,
        enabled: dto.enabled ?? true,
      },
    });
    return { data: setting, message: 'Rappel cree.' };
  }

  async update(userId: string, id: string, dto: UpdateReminderSettingDto) {
    const existing = await this.prisma.reminderSetting.findFirst({
      where: { id, car: { userId } },
    });
    if (!existing) {
      throw new NotFoundException('Rappel introuvable.');
    }

    const setting = await this.prisma.reminderSetting.update({
      where: { id },
      data: {
        daysBefore: dto.daysBefore,
        enabled: dto.enabled,
      },
    });
    return { data: setting, message: 'Rappel mis a jour.' };
  }

  private async ensureOwnedCar(userId: string, carId: string) {
    const car = await this.prisma.car.findFirst({ where: { id: carId, userId } });
    if (!car) {
      throw new NotFoundException('Vehicule introuvable.');
    }
  }

  private async ensureTargetBelongsToCar(carId: string, targetType: ReminderTargetTypeDto, targetId: string) {
    if (targetType === ReminderTargetTypeDto.document) {
      const document = await this.prisma.vehicleDocument.findFirst({ where: { id: targetId, carId } });
      if (!document) {
        throw new BadRequestException('Document cible invalide.');
      }
      return;
    }

    const item = await this.prisma.maintenanceItem.findFirst({ where: { id: targetId, carId } });
    if (!item) {
      throw new BadRequestException('Element entretien cible invalide.');
    }
  }
}
