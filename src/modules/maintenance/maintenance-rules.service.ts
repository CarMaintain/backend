import { Injectable } from '@nestjs/common';
import { MaintenanceCategoryDto, MaintenanceStatusDto, MaintenanceTypeDto } from './dto/maintenance.enums';

type Preset = {
  type: MaintenanceTypeDto;
  category: MaintenanceCategoryDto;
  label: string;
  description?: string;
  defaultIntervalKm?: number;
  defaultIntervalMonths?: number;
  watchlistSymptoms?: string[];
};

type ItemForCalculation = {
  type: string;
  category: string;
  defaultIntervalKm: number | null;
  defaultIntervalMonths: number | null;
};

type RecordForCalculation = {
  date: Date;
  mileage: number | null;
};

const WATCHLIST_TYPES = new Set<string>([MaintenanceTypeDto.clutch, MaintenanceTypeDto.flywheel]);

export const MAINTENANCE_PRESETS: Preset[] = [
  {
    type: MaintenanceTypeDto.vidange,
    category: MaintenanceCategoryDto.scheduled,
    label: 'Vidange',
    defaultIntervalKm: 10000,
    defaultIntervalMonths: 12,
  },
  {
    type: MaintenanceTypeDto.oil_filter,
    category: MaintenanceCategoryDto.scheduled,
    label: 'Filtre a huile',
    defaultIntervalKm: 10000,
    defaultIntervalMonths: 12,
  },
  {
    type: MaintenanceTypeDto.air_filter,
    category: MaintenanceCategoryDto.scheduled,
    label: 'Filtre a air',
    defaultIntervalKm: 20000,
    defaultIntervalMonths: 24,
  },
  {
    type: MaintenanceTypeDto.cabin_filter,
    category: MaintenanceCategoryDto.scheduled,
    label: 'Filtre habitacle',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
  },
  {
    type: MaintenanceTypeDto.fuel_filter,
    category: MaintenanceCategoryDto.scheduled,
    label: 'Filtre carburant',
    defaultIntervalKm: 30000,
    defaultIntervalMonths: 24,
  },
  {
    type: MaintenanceTypeDto.brakes,
    category: MaintenanceCategoryDto.inspection,
    label: 'Freins',
    defaultIntervalKm: 10000,
  },
  {
    type: MaintenanceTypeDto.tires,
    category: MaintenanceCategoryDto.inspection,
    label: 'Pneus',
    defaultIntervalKm: 10000,
  },
  {
    type: MaintenanceTypeDto.battery,
    category: MaintenanceCategoryDto.inspection,
    label: 'Batterie',
    defaultIntervalMonths: 36,
  },
  {
    type: MaintenanceTypeDto.timing_belt,
    category: MaintenanceCategoryDto.scheduled,
    label: 'Courroie de distribution',
    description: 'Intervalle sensible a confirmer selon motorisation et carnet constructeur.',
  },
  {
    type: MaintenanceTypeDto.brake_fluid,
    category: MaintenanceCategoryDto.scheduled,
    label: 'Liquide de frein',
    defaultIntervalMonths: 24,
  },
  {
    type: MaintenanceTypeDto.coolant,
    category: MaintenanceCategoryDto.scheduled,
    label: 'Liquide de refroidissement',
    defaultIntervalMonths: 48,
  },
  {
    type: MaintenanceTypeDto.clutch,
    category: MaintenanceCategoryDto.watchlist,
    label: 'Embrayage',
    description: 'Surveillance uniquement, sans intervalle fixe.',
    watchlistSymptoms: ['patinage', 'pedale dure', 'odeur de brule', 'passages difficiles'],
  },
  {
    type: MaintenanceTypeDto.flywheel,
    category: MaintenanceCategoryDto.watchlist,
    label: 'Volant moteur',
    description: 'Surveillance uniquement, sans intervalle fixe.',
    watchlistSymptoms: ['vibrations', 'claquement au demarrage', 'bruit au ralenti'],
  },
];

@Injectable()
export class MaintenanceRulesService {
  getDefaultItemsData(carId: string) {
    return MAINTENANCE_PRESETS.map((preset) => ({
      carId,
      type: preset.type,
      category: this.isWatchlist(preset.type) ? MaintenanceCategoryDto.watchlist : preset.category,
      label: preset.label,
      description: preset.description,
      defaultIntervalKm: this.isWatchlist(preset.type) ? null : preset.defaultIntervalKm,
      defaultIntervalMonths: this.isWatchlist(preset.type) ? null : preset.defaultIntervalMonths,
      status: this.isWatchlist(preset.type) ? MaintenanceStatusDto.watch : MaintenanceStatusDto.unknown,
      hasNeverBeenDone: true,
      watchlistSymptoms: preset.watchlistSymptoms,
    }));
  }

  calculateItemState(item: ItemForCalculation, records: RecordForCalculation[], currentMileage: number, today = new Date()) {
    if (this.isWatchlist(item.type)) {
      return {
        category: MaintenanceCategoryDto.watchlist,
        defaultIntervalKm: null,
        defaultIntervalMonths: null,
        lastDoneMileage: null,
        lastDoneDate: null,
        nextDueMileage: null,
        nextDueDate: null,
        hasNeverBeenDone: true,
        status: MaintenanceStatusDto.watch,
      };
    }

    const latestRecord = [...records].sort((a, b) => {
      const byDate = b.date.getTime() - a.date.getTime();
      if (byDate !== 0) {
        return byDate;
      }
      return (b.mileage ?? 0) - (a.mileage ?? 0);
    })[0];

    if (!latestRecord) {
      return {
        lastDoneMileage: null,
        lastDoneDate: null,
        nextDueMileage: null,
        nextDueDate: null,
        hasNeverBeenDone: true,
        status: MaintenanceStatusDto.unknown,
      };
    }

    const nextDueMileage =
      latestRecord.mileage !== null && item.defaultIntervalKm !== null
        ? latestRecord.mileage + item.defaultIntervalKm
        : null;
    const nextDueDate =
      item.defaultIntervalMonths !== null ? this.addMonths(latestRecord.date, item.defaultIntervalMonths) : null;

    return {
      lastDoneMileage: latestRecord.mileage,
      lastDoneDate: latestRecord.date,
      nextDueMileage,
      nextDueDate,
      hasNeverBeenDone: false,
      status: this.calculateStatus(currentMileage, nextDueMileage, nextDueDate, today),
    };
  }

  isWatchlist(type: string) {
    return WATCHLIST_TYPES.has(type);
  }

  private calculateStatus(
    currentMileage: number,
    nextDueMileage: number | null,
    nextDueDate: Date | null,
    today: Date,
  ): MaintenanceStatusDto {
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    if (nextDueMileage !== null && currentMileage >= nextDueMileage) {
      return MaintenanceStatusDto.due;
    }
    if (nextDueDate !== null && nextDueDate <= todayStart) {
      return MaintenanceStatusDto.due;
    }

    const soonByMileage = nextDueMileage !== null && nextDueMileage - currentMileage <= 1000;
    const soonByDate =
      nextDueDate !== null && nextDueDate.getTime() - todayStart.getTime() <= 30 * 24 * 60 * 60 * 1000;

    if (soonByMileage || soonByDate) {
      return MaintenanceStatusDto.soon;
    }

    if (nextDueMileage !== null || nextDueDate !== null) {
      return MaintenanceStatusDto.ok;
    }

    return MaintenanceStatusDto.unknown;
  }

  private addMonths(date: Date, months: number) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }
}
