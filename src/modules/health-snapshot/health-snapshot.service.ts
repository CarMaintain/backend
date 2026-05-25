import { Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceItem, VehicleDocument } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';

const documentUrgencyRank: Record<string, number> = {
  expired: 0,
  soon: 1,
  unknown: 2,
  valid: 3,
};

const maintenanceUrgencyRank: Record<string, number> = {
  due: 0,
  soon: 1,
  unknown: 2,
  watch: 3,
  ok: 4,
};

@Injectable()
export class HealthSnapshotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
  ) {}

  async getSnapshot(userId: string, carId: string) {
    const car = await this.prisma.car.findFirst({
      where: { id: carId, userId },
      include: {
        documents: true,
        maintenanceItems: true,
        maintenanceRecords: true,
      },
    });
    if (!car) {
      throw new NotFoundException('Vehicule introuvable.');
    }

    const legalPapers = this.sortDocumentsByUrgency(
      car.documents.map((document) => this.documentsService.withStatus(document)),
    );
    const maintenance = this.sortMaintenanceByUrgency(car.maintenanceItems);
    const overdueItems = maintenance.filter((item) => item.status === 'due');
    const upcomingItems = maintenance.filter((item) => item.status === 'soon');
    const unknownMaintenanceItems = maintenance.filter((item) => item.status === 'unknown');
    const overduePapers = legalPapers.filter((document) => document.status === 'expired');
    const maintenanceTotalCost = car.maintenanceRecords.reduce(
      (sum, record) => sum + (record.priceMad ? Number(record.priceMad) : 0),
      0,
    );

    return {
      data: {
        car: {
          id: car.id,
          brand: car.brand,
          model: car.model,
          year: car.year,
          currentMileage: car.currentMileage,
        },
        nextAction: this.getNextAction(legalPapers, maintenance),
        legalPapers,
        maintenance,
        unknownMaintenanceItems,
        overdueItems,
        upcomingItems,
        maintenanceTotalCost,
        recordCount: car.maintenanceRecords.length,
        overduePaperCount: overduePapers.length,
        unknownMaintenanceItemCount: unknownMaintenanceItems.length,
      },
    };
  }

  sortDocumentsByUrgency<T extends VehicleDocument & { status: string }>(documents: T[]) {
    return [...documents].sort((a, b) => {
      const rank = documentUrgencyRank[a.status] - documentUrgencyRank[b.status];
      if (rank !== 0) {
        return rank;
      }
      return (a.expiryDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.expiryDate?.getTime() ?? Number.MAX_SAFE_INTEGER);
    });
  }

  sortMaintenanceByUrgency<T extends MaintenanceItem>(items: T[]) {
    return [...items].sort((a, b) => {
      const rank = maintenanceUrgencyRank[a.status] - maintenanceUrgencyRank[b.status];
      if (rank !== 0) {
        return rank;
      }
      return (a.nextDueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.nextDueDate?.getTime() ?? Number.MAX_SAFE_INTEGER);
    });
  }

  private getNextAction(
    legalPapers: Array<VehicleDocument & { status: string }>,
    maintenance: MaintenanceItem[],
  ) {
    const paper = legalPapers.find((document) => document.status === 'expired' || document.status === 'soon');
    if (paper) {
      return { type: 'document', id: paper.id, label: paper.type, status: paper.status };
    }

    const item = maintenance.find((maintenanceItem) => maintenanceItem.status === 'due' || maintenanceItem.status === 'soon');
    if (item) {
      return { type: 'maintenance_item', id: item.id, label: item.label, status: item.status };
    }

    return null;
  }
}
