import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ReminderTargetTypeDto } from './reminder.enums';

export class CreateReminderSettingDto {
  @ApiProperty()
  @IsString()
  carId: string;

  @ApiProperty({ enum: ReminderTargetTypeDto })
  @IsEnum(ReminderTargetTypeDto)
  targetType: ReminderTargetTypeDto;

  @ApiProperty()
  @IsString()
  targetId: string;

  @ApiProperty({ example: [30, 7, 1] })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  daysBefore: number[];

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
