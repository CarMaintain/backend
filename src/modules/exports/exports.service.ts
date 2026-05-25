import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
  ) {}

  async exportData(userId: string, carId: string) {
    const car = await this.prisma.car.findFirst({
      where: { id: carId, userId },
      include: {
        documents: true,
        maintenanceItems: true,
        maintenanceRecords: {
          orderBy: { date: 'desc' },
          include: { maintenanceItem: true },
        },
        reminderSettings: true,
      },
    });

    if (!car) {
      throw new NotFoundException('Vehicule introuvable.');
    }

    const costs = car.maintenanceRecords.reduce(
      (summary, record) => {
        const amount = record.priceMad ? Number(record.priceMad) : 0;
        summary.totalMad += amount;
        if (record.serviceType) {
          summary.byServiceType[record.serviceType] = (summary.byServiceType[record.serviceType] ?? 0) + amount;
        }
        return summary;
      },
      { totalMad: 0, byServiceType: {} as Record<string, number> },
    );

    return {
      data: {
        car: {
          id: car.id,
          brand: car.brand,
          model: car.model,
          year: car.year,
          currentMileage: car.currentMileage,
          fuelType: car.fuelType,
          gearbox: car.gearbox,
        },
        legalPapers: car.documents.map((document) => this.documentsService.withStatus(document)),
        servicesDone: car.maintenanceRecords,
        costsSummary: costs,
        upcomingReminders: car.reminderSettings.filter((setting) => setting.enabled),
        maintenanceItemStatus: car.maintenanceItems,
      },
    };
  }
}
