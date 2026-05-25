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
      isSupabasePublicUrl?: jest.Mock;
      uploadPhotoFromDataUrl?: jest.Mock;
      uploadPhotoFromRemoteUrl?: jest.Mock;
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
      isSupabasePublicUrl: jest.fn().mockReturnValue(false),
      uploadPhotoFromDataUrl: jest.fn().mockResolvedValue({ data: { url: 'https://example.supabase.co/storage/v1/object/public/maintaincar-uploads/cars/user_1/photo.jpg' } }),
      uploadPhotoFromRemoteUrl: jest.fn().mockResolvedValue({ data: { url: 'https://example.supabase.co/storage/v1/object/public/maintaincar-uploads/cars/user_1/photo.jpg' } }),
      ...overrides?.uploadsService,
    };

    return {
      prisma,
      uploadsService,
      service: new CarsService(prisma as never, {} as never, {} as never, {} as never, uploadsService as never),
    };
  }

  it('persists an existing Supabase car photo URL without re-uploading it', async () => {
    const { service, prisma, uploadsService } = makeService({
      uploadsService: { isSupabasePublicUrl: jest.fn().mockReturnValue(true) },
    });

    await service.update('user_1', 'car_1', { photoUrl: 'https://example.supabase.co/storage/v1/object/public/maintaincar-uploads/cars/user_1/photo.jpg' });

    expect(uploadsService.uploadPhotoFromDataUrl).not.toHaveBeenCalled();
    expect(uploadsService.uploadPhotoFromRemoteUrl).not.toHaveBeenCalled();
    expect(prisma.car.update).toHaveBeenCalledWith({
      where: { id: 'car_1' },
      data: expect.objectContaining({
        photoUrl: 'https://example.supabase.co/storage/v1/object/public/maintaincar-uploads/cars/user_1/photo.jpg',
      }),
    });
  });

  it('uploads a data URL car photo to Supabase before saving it', async () => {
    const { service, prisma, uploadsService } = makeService();

    await service.update('user_1', 'car_1', {
      photoUrl: 'data:image/png;base64,aGVsbG8=',
    });

    expect(uploadsService.uploadPhotoFromDataUrl).toHaveBeenCalledWith(
      'user_1',
      { category: 'cars' },
      { dataUrl: 'data:image/png;base64,aGVsbG8=', fileName: 'car-photo' },
    );
    expect(prisma.car.update).toHaveBeenCalledWith({
      where: { id: 'car_1' },
      data: expect.objectContaining({
        photoUrl: 'https://example.supabase.co/storage/v1/object/public/maintaincar-uploads/cars/user_1/photo.jpg',
      }),
    });
  });
});
