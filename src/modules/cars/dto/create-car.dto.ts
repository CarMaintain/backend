import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { FuelTypeDto, GearboxDto } from './car.enums';

export class CreateCarDto {
  @ApiProperty({ example: 'Dacia' })
  @IsString()
  brand: string;

  @ApiProperty({ example: 'Logan' })
  @IsString()
  model: string;

  @ApiPropertyOptional({ example: 2020 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  year?: number;

  @ApiProperty({ example: 85000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  currentMileage: number;

  @ApiPropertyOptional({ enum: FuelTypeDto })
  @IsOptional()
  @IsEnum(FuelTypeDto)
  fuelType?: FuelTypeDto;

  @ApiPropertyOptional({ enum: GearboxDto })
  @IsOptional()
  @IsEnum(GearboxDto)
  gearbox?: GearboxDto;
}
