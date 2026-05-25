import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { UploadPhotoDto } from './dto/upload-photo.dto';

const DEFAULT_MAX_UPLOAD_SIZE_MB = 8;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

type UploadableFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly configService: ConfigService) {}

  async uploadPhoto(userId: string, dto: UploadPhotoDto, file?: UploadableFile) {
    if (!file) {
      throw new BadRequestException('Photo file is required.');
    }
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only image uploads are supported.');
    }

    const maxSizeMb = this.configService.get<number>('maxUploadSizeMb', DEFAULT_MAX_UPLOAD_SIZE_MB);
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(`Photo exceeds the ${maxSizeMb}MB limit.`);
    }

    return this.uploadPhotoBuffer(userId, dto, file);
  }

  async uploadPhotoFromDataUrl(
    userId: string,
    dto: UploadPhotoDto,
    input: { dataUrl: string; fileName?: string | null },
  ) {
    const match = input.dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      throw new BadRequestException('Unsupported photo payload.');
    }

    const [, mimetype, encoded] = match;
    const buffer = Buffer.from(encoded, 'base64');
    return this.uploadPhotoBuffer(userId, dto, {
      buffer,
      mimetype,
      originalname: input.fileName ?? `photo.${mimetype.split('/')[1] ?? 'jpg'}`,
      size: buffer.byteLength,
    });
  }

  async uploadPhotoFromRemoteUrl(
    userId: string,
    dto: UploadPhotoDto,
    input: { url: string; fileName?: string | null },
  ) {
    const response = await fetch(input.url);
    if (!response.ok) {
      throw new BadRequestException('Unable to fetch the provided photo URL.');
    }

    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    if (!ALLOWED_IMAGE_MIME_TYPES.has(contentType)) {
      throw new BadRequestException('Only image URLs are supported.');
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return this.uploadPhotoBuffer(userId, dto, {
      buffer,
      mimetype: contentType,
      originalname: input.fileName ?? 'photo',
      size: buffer.byteLength,
    });
  }

  isSupabasePublicUrl(url: string) {
    const supabaseUrl = this.configService.get<string>('supabase.url');
    const bucket = this.configService.get<string>('supabase.storageBucket', 'maintaincar-uploads');
    if (!supabaseUrl) {
      return false;
    }
    return url.startsWith(`${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/`);
  }

  private async uploadPhotoBuffer(userId: string, dto: UploadPhotoDto, file: UploadableFile) {
    const supabaseUrl = this.configService.get<string>('supabase.url');
    const serviceRoleKey = this.configService.get<string>('supabase.serviceRoleKey');
    const bucket = this.configService.get<string>('supabase.storageBucket', 'maintaincar-uploads');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new InternalServerErrorException('Supabase storage is not configured.');
    }

    const category = dto.category ?? 'documents';
    const filePath = this.buildStoragePath(userId, category, file.originalname, file.mimetype);
    const uploadUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${bucket}/${filePath}`;

    this.logger.log(`Uploading ${category} photo for user ${userId} to Supabase bucket ${bucket}`);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': file.mimetype,
        'x-upsert': 'false',
      },
      body: new Uint8Array(file.buffer),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Supabase upload failed with ${response.status}: ${errorBody}`);
      throw new InternalServerErrorException('Photo upload failed.');
    }

    return {
      data: {
        bucket,
        category,
        path: filePath,
        mimeType: file.mimetype,
        size: file.size,
        url: `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${filePath}`,
      },
      message: 'Photo uploaded successfully.',
    };
  }

  private buildStoragePath(userId: string, category: string, originalName: string, mimeType: string) {
    const extension = this.normalizedExtension(originalName, mimeType);
    return `${category}/${userId}/${Date.now()}-${randomUUID()}.${extension}`;
  }

  private normalizedExtension(originalName: string, mimeType: string) {
    const fileExtension = extname(originalName).replace('.', '').trim().toLowerCase();
    if (fileExtension) {
      return fileExtension;
    }
    return mimeType.split('/')[1] ?? 'jpg';
  }
}
