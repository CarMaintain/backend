import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { MileageSourceDto } from './mileage.enums';

export class CreateMileageUpdateDto {
  @ApiProperty({ example: 90500 })
  @IsInt()
  @Min(0)
  mileage: number;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ enum: MileageSourceDto })
  @IsOptional()
  @IsEnum(MileageSourceDto)
  source?: MileageSourceDto;
}
