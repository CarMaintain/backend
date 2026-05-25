import { Prisma } from '@prisma/client';
import { MaintenanceService } from '../src/modules/maintenance/maintenance.service';

describe('MaintenanceService', () => {
  it('creates a maintenance record when nullable fields are sent as null', async () => {
    const prisma = {
      car: {
        findFirst: jest.fn().mockResolvedValue({ id: 'car_1', userId: 'user_1', currentMileage: 80000 }),
        update: jest.fn().mockResolvedValue({}),
      },
      maintenanceItem: {
        findFirst: jest.fn().mockResolvedValue({ id: 'item_1', carId: 'car_1' }),
      },
      maintenanceRecord: {
        create: jest.fn().mockResolvedValue({ id: 'record_1' }),
      },
      mileageUpdate: {
        create: jest.fn().mockResolvedValue({}),
      },
    } as any;
    const rulesService = {} as any;
    const service = new MaintenanceService(prisma, rulesService);
    jest.spyOn(service as any, 'recalculateItemsForCar').mockResolvedValue(undefined);

    const result = await service.createRecord('user_1', 'car_1', {
      maintenanceItemId: 'item_1',
      serviceType: 'fuel_filter',
      date: '2026-05-20',
      mileage: 85000,
      priceMad: null,
      garageName: null,
      receiptPhotoUrl: null,
      notes: null,
      checklist: {},
    });

    expect(prisma.maintenanceRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        maintenanceItemId: 'item_1',
        priceMad: null,
        garageName: null,
        receiptPhotoUrl: null,
        notes: null,
        checklist: {},
      }),
    });
    expect(prisma.car.update).toHaveBeenCalledWith({
      where: { id: 'car_1' },
      data: { currentMileage: 85000 },
    });
    expect(prisma.mileageUpdate.create).toHaveBeenCalledWith({
      data: {
        carId: 'car_1',
        mileage: 85000,
        date: new Date('2026-05-20'),
        source: 'maintenance_record',
      },
    });
    expect(result).toEqual({ data: { id: 'record_1' }, message: 'Intervention ajoutee.' });
  });

  it('maps numeric priceMad to a Prisma decimal when present', async () => {
    const prisma = {
      car: {
        findFirst: jest.fn().mockResolvedValue({ id: 'car_1', userId: 'user_1', currentMileage: 80000 }),
        update: jest.fn().mockResolvedValue({}),
      },
      maintenanceItem: {
        findFirst: jest.fn().mockResolvedValue({ id: 'item_1', carId: 'car_1' }),
      },
      maintenanceRecord: {
        create: jest.fn().mockResolvedValue({ id: 'record_1' }),
      },
      mileageUpdate: {
        create: jest.fn().mockResolvedValue({}),
      },
    } as any;
    const service = new MaintenanceService(prisma, {} as any);
    jest.spyOn(service as any, 'recalculateItemsForCar').mockResolvedValue(undefined);

    await service.createRecord('user_1', 'car_1', {
      maintenanceItemId: 'item_1',
      serviceType: 'fuel_filter',
      date: '2026-05-20',
      priceMad: 240,
    });

    const [{ data }] = prisma.maintenanceRecord.create.mock.calls[0];
    expect(data.priceMad).toBeInstanceOf(Prisma.Decimal);
    expect(data.priceMad.toString()).toBe('240');
  });
});
