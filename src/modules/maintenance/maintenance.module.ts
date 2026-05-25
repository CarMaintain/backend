import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceRulesService } from './maintenance-rules.service';
import { MaintenanceService } from './maintenance.service';

@Module({
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenanceRulesService],
  exports: [MaintenanceService, MaintenanceRulesService],
})
export class MaintenanceModule {}
