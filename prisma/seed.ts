import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DEFAULT_DOCUMENT_REMINDER_DAYS, DEFAULT_DOCUMENT_TYPES } from '../src/modules/documents/documents.service';
import { MaintenanceRulesService } from '../src/modules/maintenance/maintenance-rules.service';

const prisma = new PrismaClient();
const rules = new MaintenanceRulesService();

async function main() {
  const email = 'test@maintaincar.ma';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const user = await prisma.user.create({
    data: {
      email,
      fullName: 'Utilisateur Test',
      passwordHash: await bcrypt.hash('password123', 12),
    },
  });

  const car = await prisma.car.create({
    data: {
      userId: user.id,
      brand: 'Dacia',
      model: 'Logan',
      year: 2020,
      currentMileage: 90000,
      fuelType: 'diesel',
      gearbox: 'manual',
    },
  });

  await prisma.vehicleDocument.createMany({
    data: DEFAULT_DOCUMENT_TYPES.map((type, index) => ({
      carId: car.id,
      type,
      expiryDate: index === 0 ? new Date('2026-08-01') : index === 1 ? new Date('2026-12-31') : null,
      reminderDaysBefore: DEFAULT_DOCUMENT_REMINDER_DAYS,
    })),
  });

  await prisma.maintenanceItem.createMany({
    data: rules.getDefaultItemsData(car.id),
  });

  const items = await prisma.maintenanceItem.findMany({ where: { carId: car.id } });
  const vidange = items.find((item) => item.type === 'vidange');
  const oilFilter = items.find((item) => item.type === 'oil_filter');
  const brakes = items.find((item) => item.type === 'brakes');

  await prisma.maintenanceRecord.createMany({
    data: [
      {
        carId: car.id,
        maintenanceItemId: vidange?.id,
        serviceType: 'vidange',
        category: 'scheduled',
        date: new Date('2026-01-10'),
        mileage: 85000,
        priceMad: 450,
        garageName: 'Garage Atlas',
        checklist: { oil: true },
      },
      {
        carId: car.id,
        maintenanceItemId: oilFilter?.id,
        serviceType: 'oil_filter',
        category: 'scheduled',
        date: new Date('2026-01-10'),
        mileage: 85000,
        priceMad: 80,
        garageName: 'Garage Atlas',
        checklist: { filter: true },
      },
      {
        carId: car.id,
        maintenanceItemId: brakes?.id,
        serviceType: 'brakes',
        category: 'inspection',
        date: new Date('2026-02-15'),
        mileage: 87000,
        priceMad: 0,
        garageName: 'Garage Atlas',
        checklist: { inspected: true },
      },
    ],
  });

  await prisma.mileageUpdate.create({
    data: {
      carId: car.id,
      mileage: 90000,
      date: new Date('2026-05-20'),
      source: 'manual',
    },
  });

  for (const item of items) {
    const records = await prisma.maintenanceRecord.findMany({
      where: {
        carId: car.id,
        OR: [{ maintenanceItemId: item.id }, { serviceType: item.type }],
      },
    });
    const state = rules.calculateItemState(item, records, car.currentMileage);
    await prisma.maintenanceItem.update({
      where: { id: item.id },
      data: state,
    });
  }

  console.log(`Seed complete. Login: ${email} / password123`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
