import { Module } from '@nestjs/common';
import { MileageController } from './mileage.controller';
import { MileageService } from './mileage.service';

@Module({
  controllers: [MileageController],
  providers: [MileageService],
  exports: [MileageService],
})
export class MileageModule {}
