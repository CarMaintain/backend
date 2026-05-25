import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { MaintenanceCategoryDto, MaintenanceStatusDto } from './dto/maintenance.enums';
import { UpdateMaintenanceItemDto } from './dto/update-maintenance-item.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';
import { MaintenanceRulesService } from './maintenance-rules.service';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesService: MaintenanceRulesService,
  ) {}

  async generateDefaultItems(carId: string) {
    await this.prisma.maintenanceItem.createMany({
      data: this.rulesService.getDefaultItemsData(carId),
      skipDuplicates: true,
    });
    await this.recalculateItemsForCar(carId);
  }

  async findItemsByCar(userId: string, carId: string) {
    await this.ensureOwnedCar(userId, carId);
    const items = await this.prisma.maintenanceItem.findMany({
      where: { carId },
      orderBy: [{ category: 'asc' }, { label: 'asc' }],
    });
    return { data: items };
  }

  async updateItem(userId: string, id: string, dto: UpdateMaintenanceItemDto) {
    const item = await this.getOwnedItem(userId, id);
    const isWatchlist = this.rulesService.isWatchlist(item.type);

    const updated = await this.prisma.maintenanceItem.update({
      where: { id },
      data: {
        label: dto.label,
        description: dto.description,
        defaultIntervalKm: isWatchlist ? null : dto.defaultIntervalKm,
        defaultIntervalMonths: isWatchlist ? null : dto.defaultIntervalMonths,
        category: isWatchlist ? MaintenanceCategoryDto.watchlist : undefined,
        status: isWatchlist ? MaintenanceStatusDto.watch : undefined,
        watchlistSymptoms: dto.watchlistSymptoms,
      },
    });

    await this.recalculateItem(id);
    const recalculated = await this.prisma.maintenanceItem.findUniqueOrThrow({ where: { id: updated.id } });
    return { data: recalculated, message: 'Entretien mis a jour.' };
  }

  async regenerateItems(userId: string, carId: string) {
    await this.ensureOwnedCar(userId, carId);
    await this.generateDefaultItems(carId);
    const items = await this.prisma.maintenanceItem.findMany({ where: { carId }, orderBy: { label: 'asc' } });
    return { data: items, message: 'Elements entretien regeneres.' };
  }

  async findRecordsByCar(userId: string, carId: string) {
    await this.ensureOwnedCar(userId, carId);
    const records = await this.prisma.maintenanceRecord.findMany({
      where: { carId },
      orderBy: { date: 'desc' },
      include: { maintenanceItem: true },
    });
    return { data: records };
  }

  async createRecord(userId: string, carId: string, dto: CreateMaintenanceRecordDto) {
    const car = await this.ensureOwnedCar(userId, carId);
    await this.validateRecordItem(carId, dto.maintenanceItemId);

    const record = await this.prisma.maintenanceRecord.create({
      data: {
        carId,
        maintenanceItemId: dto.maintenanceItemId ?? null,
        serviceType: dto.serviceType,
        category: dto.category ?? null,
        date: new Date(dto.date),
        mileage: dto.mileage ?? null,
        priceMad: this.toNullableDecimal(dto.priceMad),
        garageName: dto.garageName ?? null,
        receiptPhotoUrl: dto.receiptPhotoUrl ?? null,
        notes: dto.notes ?? null,
        checklist: (dto.checklist ?? {}) as Prisma.InputJsonValue,
      },
    });

    if (dto.mileage != null && dto.mileage > car.currentMileage) {
      await this.prisma.car.update({ where: { id: carId }, data: { currentMileage: dto.mileage } });
      await this.prisma.mileageUpdate.create({
        data: {
          carId,
          mileage: dto.mileage,
          date: new Date(dto.date),
          source: 'maintenance_record',
        },
      });
    }

    await this.recalculateItemsForCar(carId);
    return { data: record, message: 'Intervention ajoutee.' };
  }

  async findRecord(userId: string, id: string) {
    const record = await this.getOwnedRecord(userId, id);
    return { data: record };
  }

  async updateRecord(userId: string, id: string, dto: UpdateMaintenanceRecordDto) {
    const existing = await this.getOwnedRecord(userId, id);
    await this.validateRecordItem(existing.carId, dto.maintenanceItemId);

    const record = await this.prisma.maintenanceRecord.update({
      where: { id },
      data: {
        maintenanceItemId: dto.maintenanceItemId === undefined ? undefined : (dto.maintenanceItemId ?? null),
        serviceType: dto.serviceType,
        category: dto.category === undefined ? undefined : (dto.category ?? null),
        date: dto.date ? new Date(dto.date) : undefined,
        mileage: dto.mileage === undefined ? undefined : (dto.mileage ?? null),
        priceMad: dto.priceMad === undefined ? undefined : this.toNullableDecimal(dto.priceMad),
        garageName: dto.garageName === undefined ? undefined : (dto.garageName ?? null),
        receiptPhotoUrl: dto.receiptPhotoUrl === undefined ? undefined : (dto.receiptPhotoUrl ?? null),
        notes: dto.notes === undefined ? undefined : (dto.notes ?? null),
        checklist: dto.checklist === undefined ? undefined : ((dto.checklist ?? {}) as Prisma.InputJsonValue),
      },
    });

    await this.syncMileageFromRecords(existing.carId);
    await this.recalculateItemsForCar(existing.carId);
    return { data: record, message: 'Intervention mise a jour.' };
  }

  async removeRecord(userId: string, id: string) {
    const existing = await this.getOwnedRecord(userId, id);
    await this.prisma.maintenanceRecord.delete({ where: { id } });
    await this.syncMileageFromRecords(existing.carId);
    await this.recalculateItemsForCar(existing.carId);
    return { data: { id }, message: 'Intervention supprimee.' };
  }

  async recalculateItemsForCar(carId: string) {
    const car = await this.prisma.car.findUniqueOrThrow({ where: { id: carId } });
    const items = await this.prisma.maintenanceItem.findMany({ where: { carId } });
    await Promise.all(items.map((item) => this.recalculateItemWithCar(item.id, car.currentMileage)));
  }

  async recalculateItem(itemId: string) {
    const item = await this.prisma.maintenanceItem.findUniqueOrThrow({ where: { id: itemId }, include: { car: true } });
    await this.recalculateItemWithCar(item.id, item.car.currentMileage);
  }

  private async recalculateItemWithCar(itemId: string, currentMileage: number) {
    const item = await this.prisma.maintenanceItem.findUniqueOrThrow({ where: { id: itemId } });
    const records = await this.prisma.maintenanceRecord.findMany({
      where: {
        carId: item.carId,
        OR: [{ maintenanceItemId: item.id }, { serviceType: item.type }],
      },
    });

    const state = this.rulesService.calculateItemState(item, records, currentMileage);
    await this.prisma.maintenanceItem.update({
      where: { id: item.id },
      data: state,
    });
  }

  private toNullableDecimal(value?: number | null) {
    return value == null ? null : new Prisma.Decimal(value);
  }

  private async validateRecordItem(carId: string, maintenanceItemId?: string | null) {
    if (!maintenanceItemId) {
      return;
    }
    const item = await this.prisma.maintenanceItem.findFirst({ where: { id: maintenanceItemId, carId } });
    if (!item) {
      throw new BadRequestException('Element entretien invalide pour ce vehicule.');
    }
  }

  private async getOwnedItem(userId: string, id: string) {
    const item = await this.prisma.maintenanceItem.findFirst({
      where: { id, car: { userId } },
    });
    if (!item) {
      throw new NotFoundException('Element entretien introuvable.');
    }
    return item;
  }

  private async getOwnedRecord(userId: string, id: string) {
    const record = await this.prisma.maintenanceRecord.findFirst({
      where: { id, car: { userId } },
      include: { maintenanceItem: true },
    });
    if (!record) {
      throw new NotFoundException('Intervention introuvable.');
    }
    return record;
  }

  private async ensureOwnedCar(userId: string, carId: string) {
    const car = await this.prisma.car.findFirst({ where: { id: carId, userId } });
    if (!car) {
      throw new NotFoundException('Vehicule introuvable.');
    }
    return car;
  }

  private async syncMileageFromRecords(carId: string) {
    const car = await this.prisma.car.findUniqueOrThrow({ where: { id: carId } });
    const maxRecordMileage = await this.prisma.maintenanceRecord.aggregate({
      where: { carId, mileage: { not: null } },
      _max: { mileage: true },
    });

    if (maxRecordMileage._max.mileage !== null && maxRecordMileage._max.mileage > car.currentMileage) {
      await this.prisma.car.update({
        where: { id: carId },
        data: { currentMileage: maxRecordMileage._max.mileage },
      });
    }
  }
}
