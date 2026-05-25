import { MaintenanceCategoryDto, MaintenanceStatusDto } from '../src/modules/maintenance/dto/maintenance.enums';
import { MaintenanceRulesService } from '../src/modules/maintenance/maintenance-rules.service';

describe('MaintenanceRulesService', () => {
  const service = new MaintenanceRulesService();

  it('keeps clutch and flywheel as watchlist-only items', () => {
    const clutch = service.calculateItemState(
      {
        type: 'clutch',
        category: MaintenanceCategoryDto.scheduled,
        defaultIntervalKm: 10000,
        defaultIntervalMonths: 12,
      },
      [{ date: new Date('2026-01-01'), mileage: 80000 }],
      90000,
    );

    expect(clutch).toMatchObject({
      category: MaintenanceCategoryDto.watchlist,
      defaultIntervalKm: null,
      defaultIntervalMonths: null,
      nextDueMileage: null,
      nextDueDate: null,
      status: MaintenanceStatusDto.watch,
    });
  });

  it('marks a scheduled item due when current mileage passes next due mileage', () => {
    const result = service.calculateItemState(
      {
        type: 'vidange',
        category: MaintenanceCategoryDto.scheduled,
        defaultIntervalKm: 10000,
        defaultIntervalMonths: 12,
      },
      [{ date: new Date('2025-01-01'), mileage: 80000 }],
      90500,
      new Date('2025-06-01'),
    );

    expect(result.nextDueMileage).toBe(90000);
    expect(result.status).toBe(MaintenanceStatusDto.due);
  });
});
