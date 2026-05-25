export enum MaintenanceTypeDto {
  vidange = 'vidange',
  oil_filter = 'oil_filter',
  air_filter = 'air_filter',
  cabin_filter = 'cabin_filter',
  fuel_filter = 'fuel_filter',
  brakes = 'brakes',
  tires = 'tires',
  battery = 'battery',
  timing_belt = 'timing_belt',
  brake_fluid = 'brake_fluid',
  coolant = 'coolant',
  clutch = 'clutch',
  flywheel = 'flywheel',
}

export enum MaintenanceCategoryDto {
  scheduled = 'scheduled',
  inspection = 'inspection',
  watchlist = 'watchlist',
}

export enum MaintenanceStatusDto {
  due = 'due',
  soon = 'soon',
  ok = 'ok',
  unknown = 'unknown',
  watch = 'watch',
}
