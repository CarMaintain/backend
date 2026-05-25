import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateMaintenanceRecordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maintenanceItemId?: string | null;

  @ApiProperty({ example: 'vidange' })
  @IsString()
  serviceType: string;

  @ApiPropertyOptional({ example: 'scheduled' })
  @IsOptional()
  @IsString()
  category?: string | null;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 90000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number | null;

  @ApiPropertyOptional({ example: 450 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMad?: number | null;

  @ApiPropertyOptional({ example: 'Garage Atlas' })
  @IsOptional()
  @IsString()
  garageName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptPhotoUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ example: { oilChanged: true } })
  @IsOptional()
  @IsObject()
  checklist?: Record<string, unknown> | null;
}
