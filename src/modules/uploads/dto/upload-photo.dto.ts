import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export const uploadPhotoCategories = ['documents', 'maintenance', 'cars'] as const;

export class UploadPhotoDto {
  @ApiPropertyOptional({ enum: uploadPhotoCategories, default: 'documents' })
  @IsOptional()
  @IsString()
  @IsIn(uploadPhotoCategories)
  category?: (typeof uploadPhotoCategories)[number];
}
