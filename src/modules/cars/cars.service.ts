import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { MileageSourceDto } from '../mileage/dto/mileage.enums';
import { MileageService } from '../mileage/mileage.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarMileageDto } from './dto/update-car-mileage.dto';
import { UpdateCarDto } from './dto/update-car.dto';

type UploadedPhotoFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

const carResponseSelect = {
  id: true,
  userId: true,
  brand: true,
  model: true,
  year: true,
  currentMileage: true,
  fuelType: true,
  gearbox: true,
  photoUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CarSelect;

@Injectable()
export class CarsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
    private readonly maintenanceService: MaintenanceService,
    private readonly mileageService: MileageService,
    private readonly uploadsService: UploadsService,
  ) {}

  async findAll(userId: string) {
    const cars = await this.prisma.car.findMany({
      where: { userId },
      select: carResponseSelect,
      orderBy: { createdAt: 'desc' },
    });
    return { data: cars };
  }

  async create(userId: string, dto: CreateCarDto) {
    const car = await this.prisma.car.create({
      data: {
        userId,
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        currentMileage: dto.currentMileage,
        fuelType: dto.fuelType,
        gearbox: dto.gearbox,
      },
      select: carResponseSelect,
    });

    await this.documentsService.createDefaults(car.id);
    await this.maintenanceService.generateDefaultItems(car.id);
    await this.mileageService.createForOwnedCar(userId, car.id, {
      mileage: car.currentMileage,
      date: new Date().toISOString(),
      source: MileageSourceDto.manual,
    });

    return { data: car, message: 'Vehicule cree.' };
  }

  async findOne(userId: string, carId: string) {
    const ownedCar = await this.getOwnedCar(userId, carId);
    return { data: ownedCar };
  }

  async update(userId: string, carId: string, dto: UpdateCarDto, photoFile?: UploadedPhotoFile) {
    const existingCar = await this.getOwnedCar(userId, carId);

    if (dto.currentMileage !== undefined) {
      if (dto.currentMileage < existingCar.currentMileage) {
        throw new BadRequestException('Le kilometrage ne peut pas etre baisse silencieusement.');
      }

      if (dto.currentMileage > existingCar.currentMileage) {
        await this.mileageService.createForOwnedCar(userId, carId, {
          mileage: dto.currentMileage,
          date: new Date().toISOString(),
          source: MileageSourceDto.manual,
        });
        await this.maintenanceService.recalculateItemsForCar(carId);
      }
    }

    const updatedCar = await this.prisma.car.update({
      where: { id: carId },
      data: {
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        fuelType: dto.fuelType,
        gearbox: dto.gearbox,
        currentMileage: dto.currentMileage,
        photoUrl: photoFile ? await this.uploadCarPhoto(userId, photoFile) : undefined,
      },
      select: carResponseSelect,
    });
    return { data: updatedCar, message: 'Modifications enregistrees.' };
  }

  async remove(userId: string, carId: string) {
    await this.getOwnedCar(userId, carId);
    await this.prisma.car.delete({ where: { id: carId } });
    return { data: { id: carId }, message: 'Vehicule supprime.' };
  }

  async updateMileage(userId: string, carId: string, dto: UpdateCarMileageDto) {
    const car = await this.getOwnedCar(userId, carId);
    if (dto.mileage < car.currentMileage) {
      throw new BadRequestException('Le kilometrage ne peut pas etre baisse silencieusement.');
    }

    const update = await this.mileageService.createForOwnedCar(userId, carId, {
      mileage: dto.mileage,
      date: dto.date ?? new Date().toISOString(),
      source: MileageSourceDto.manual,
    });
    await this.maintenanceService.recalculateItemsForCar(carId);
    return update;
  }

  async getOwnedCar(userId: string, carId: string) {
    const car = await this.prisma.car.findFirst({
      where: { id: carId, userId },
      select: carResponseSelect,
    });
    if (!car) {
      throw new NotFoundException('Vehicule introuvable.');
    }
    return car;
  }

  private async uploadCarPhoto(userId: string, photoFile: UploadedPhotoFile) {
    const upload = await this.uploadsService.uploadPhoto(userId, { category: 'cars' }, photoFile);
    return upload.data.url;
  }
}
