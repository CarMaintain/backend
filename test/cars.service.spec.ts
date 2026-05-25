import { CarsService } from '../src/modules/cars/cars.service';

describe('CarsService', () => {
  function makeService(overrides?: {
    prisma?: {
      car?: {
        findFirst?: jest.Mock;
        update?: jest.Mock;
      };
    };
    uploadsService?: {
      uploadPhoto?: jest.Mock;
    };
    maintenanceService?: {
      recalculateItemsForCar?: jest.Mock;
    };
    mileageService?: {
      createForOwnedCar?: jest.Mock;
    };
  }) {
    const prisma = {
      car: {
        findFirst: jest.fn().mockResolvedValue({ id: 'car_1', userId: 'user_1', currentMileage: 80000 }),
        update: jest.fn().mockResolvedValue({ id: 'car_1', photoUrl: 'https://stored-url' }),
      },
      ...overrides?.prisma,
    };

    const uploadsService = {
      uploadPhoto: jest.fn().mockResolvedValue({
        data: { url: 'https://example.supabase.co/storage/v1/object/public/maintaincar-uploads/cars/user_1/photo.jpg' },
      }),
      ...overrides?.uploadsService,
    };
    const maintenanceService = {
      recalculateItemsForCar: jest.fn().mockResolvedValue(undefined),
      ...overrides?.maintenanceService,
    };
    const mileageService = {
      createForOwnedCar: jest.fn().mockResolvedValue({ data: { mileage: 85000 } }),
      ...overrides?.mileageService,
    };

    return {
      prisma,
      uploadsService,
      maintenanceService,
      mileageService,
      service: new CarsService(
        prisma as never,
        {} as never,
        maintenanceService as never,
        mileageService as never,
        uploadsService as never,
      ),
    };
  }

  it('uploads a photoFile to Supabase before saving the car', async () => {
    const { service, prisma, uploadsService } = makeService();

    await service.update(
      'user_1',
      'car_1',
      {},
      {
        buffer: Buffer.from('image-bytes'),
        mimetype: 'image/jpeg',
        originalname: 'car.jpg',
        size: 1024,
      },
    );

    expect(uploadsService.uploadPhoto).toHaveBeenCalledWith(
      'user_1',
      { category: 'cars' },
      expect.objectContaining({
        mimetype: 'image/jpeg',
        originalname: 'car.jpg',
        size: 1024,
      }),
    );
    expect(prisma.car.update).toHaveBeenCalledWith({
      where: { id: 'car_1' },
      data: expect.objectContaining({
        photoUrl: 'https://example.supabase.co/storage/v1/object/public/maintaincar-uploads/cars/user_1/photo.jpg',
      }),
    });
  });

  it('updates mileage and other fields in the same patch request', async () => {
    const { service, prisma, mileageService, maintenanceService } = makeService();

    await service.update('user_1', 'car_1', {
      brand: 'BMW',
      currentMileage: 85000,
    });

    expect(mileageService.createForOwnedCar).toHaveBeenCalledWith(
      'user_1',
      'car_1',
      expect.objectContaining({
        mileage: 85000,
        source: 'manual',
      }),
    );
    expect(maintenanceService.recalculateItemsForCar).toHaveBeenCalledWith('car_1');
    expect(prisma.car.update).toHaveBeenCalledWith({
      where: { id: 'car_1' },
      data: expect.objectContaining({
        brand: 'BMW',
        currentMileage: 85000,
      }),
    });
  });
});
