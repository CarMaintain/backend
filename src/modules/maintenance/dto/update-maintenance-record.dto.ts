import { PartialType } from '@nestjs/swagger';
import { CreateMaintenanceRecordDto } from './create-maintenance-record.dto';

export class UpdateMaintenanceRecordDto extends PartialType(CreateMaintenanceRecordDto) {}
