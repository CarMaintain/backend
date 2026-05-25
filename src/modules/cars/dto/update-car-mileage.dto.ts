import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateCarMileageDto {
  @ApiProperty({ example: 90500 })
  @IsInt()
  @Min(0)
  mileage: number;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  date?: string;
}
