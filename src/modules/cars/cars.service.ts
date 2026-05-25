import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { MileageSourceDto } from '../mileage/dto/mileage.enums';
import { MileageService } from '../mileage/mileage.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarMileageDto } from './dto/update-car-mileage.dto';
import { UpdateCarDto } from './dto/update-car.dto';

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
    const car = await this.getOwnedCar(userId, carId);
    return { data: car };
  }

  async update(userId: string, carId: string, dto: UpdateCarDto) {
    await this.getOwnedCar(userId, carId);

    if (dto.currentMileage !== undefined) {
      return this.updateMileage(userId, carId, {
        mileage: dto.currentMileage,
        date: new Date().toISOString(),
      });
    }

    const car = await this.prisma.car.update({
      where: { id: carId },
      data: {
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        fuelType: dto.fuelType,
        gearbox: dto.gearbox,
        photoUrl: dto.photoUrl === undefined ? undefined : await this.resolveCarPhotoUrl(userId, dto.photoUrl),
      },
    });
    return { data: car, message: 'Modifications enregistrees.' };
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
    });
    if (!car) {
      throw new NotFoundException('Vehicule introuvable.');
    }
    return car;
  }

  private async resolveCarPhotoUrl(userId: string, photoUrl: string | null) {
    if (photoUrl === null) {
      return null;
    }
    if (this.uploadsService.isSupabasePublicUrl(photoUrl)) {
      return photoUrl;
    }
    if (photoUrl.startsWith('data:image/')) {
      const upload = await this.uploadsService.uploadPhotoFromDataUrl(
        userId,
        { category: 'cars' },
        { dataUrl: photoUrl, fileName: 'car-photo' },
      );
      return upload.data.url;
    }
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      const upload = await this.uploadsService.uploadPhotoFromRemoteUrl(
        userId,
        { category: 'cars' },
        { url: photoUrl, fileName: 'car-photo' },
      );
      return upload.data.url;
    }
    throw new BadRequestException('Car photo must be a Supabase URL, a remote image URL, or a data URL.');
  }
}
