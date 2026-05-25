import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentStatus, VehicleDocumentTypeDto } from './dto/document.enums';
import { RenewDocumentDto } from './dto/renew-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

export const DEFAULT_DOCUMENT_REMINDER_DAYS = [30, 7, 1];

export const DEFAULT_DOCUMENT_TYPES = [
  VehicleDocumentTypeDto.assurance,
  VehicleDocumentTypeDto.vignette,
  VehicleDocumentTypeDto.visite_technique,
  VehicleDocumentTypeDto.carte_grise,
];

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDefaults(carId: string) {
    await this.prisma.vehicleDocument.createMany({
      data: DEFAULT_DOCUMENT_TYPES.map((type) => ({
        carId,
        type,
        reminderDaysBefore: DEFAULT_DOCUMENT_REMINDER_DAYS,
      })),
      skipDuplicates: true,
    });
  }

  async findByCar(userId: string, carId: string) {
    await this.ensureOwnedCar(userId, carId);
    const documents = await this.prisma.vehicleDocument.findMany({
      where: { carId },
      orderBy: { type: 'asc' },
    });
    return { data: documents.map((document) => this.withStatus(document)) };
  }

  async findOne(userId: string, id: string) {
    const document = await this.getOwnedDocument(userId, id);
    return { data: this.withStatus(document) };
  }

  async update(userId: string, id: string, dto: UpdateDocumentDto) {
    await this.getOwnedDocument(userId, id);
    const document = await this.prisma.vehicleDocument.update({
      where: { id },
      data: {
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        reminderDaysBefore: dto.reminderDaysBefore,
        photoUrl: dto.photoUrl,
        notes: dto.notes,
      },
    });
    return { data: this.withStatus(document), message: 'Document mis a jour.' };
  }

  async renew(userId: string, id: string, dto: RenewDocumentDto) {
    await this.getOwnedDocument(userId, id);
    const document = await this.prisma.vehicleDocument.update({
      where: { id },
      data: {
        expiryDate: new Date(dto.expiryDate),
        photoUrl: dto.photoUrl,
        notes: dto.notes,
      },
    });
    return { data: this.withStatus(document), message: 'Document renouvele.' };
  }

  calculateStatus(expiryDate?: Date | null, today = new Date()): DocumentStatus {
    if (!expiryDate) {
      return DocumentStatus.unknown;
    }

    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const expiryStart = new Date(expiryDate);
    expiryStart.setHours(0, 0, 0, 0);

    if (expiryStart < todayStart) {
      return DocumentStatus.expired;
    }

    const daysUntilExpiry = Math.ceil((expiryStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000));
    if (daysUntilExpiry <= 30) {
      return DocumentStatus.soon;
    }

    return DocumentStatus.valid;
  }

  withStatus<T extends { expiryDate: Date | null }>(document: T) {
    return {
      ...document,
      status: this.calculateStatus(document.expiryDate),
    };
  }

  private async getOwnedDocument(userId: string, id: string) {
    const document = await this.prisma.vehicleDocument.findFirst({
      where: { id, car: { userId } },
    });
    if (!document) {
      throw new NotFoundException('Document introuvable.');
    }
    return document;
  }

  private async ensureOwnedCar(userId: string, carId: string) {
    const car = await this.prisma.car.findFirst({ where: { id: carId, userId } });
    if (!car) {
      throw new NotFoundException('Vehicule introuvable.');
    }
  }
}
