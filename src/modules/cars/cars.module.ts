import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { MileageModule } from '../mileage/mileage.module';
import { UploadsModule } from '../uploads/uploads.module';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';

@Module({
  imports: [DocumentsModule, MaintenanceModule, MileageModule, UploadsModule],
  controllers: [CarsController],
  providers: [CarsService],
  exports: [CarsService],
})
export class CarsModule {}
