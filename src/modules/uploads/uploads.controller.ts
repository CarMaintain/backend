import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { UploadsService } from './uploads.service';

const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024;

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('uploads/photos')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['documents', 'maintenance'] },
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: DEFAULT_MAX_UPLOAD_SIZE_BYTES },
    }),
  )
  uploadPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadPhotoDto,
    @UploadedFile() file?: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ) {
    return this.uploadsService.uploadPhoto(user.id, dto, file);
  }
}
