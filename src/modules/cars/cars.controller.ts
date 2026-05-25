import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarMileageDto } from './dto/update-car-mileage.dto';
import { UpdateCarDto } from './dto/update-car.dto';

const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024;

@ApiTags('cars')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.carsService.findAll(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCarDto) {
    return this.carsService.create(user.id, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.carsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        brand: { type: 'string' },
        model: { type: 'string' },
        year: { type: 'number' },
        currentMileage: { type: 'number' },
        fuelType: { type: 'string', enum: ['diesel', 'essence', 'hybrid', 'electric'] },
        gearbox: { type: 'string', enum: ['manual', 'automatic'] },
        photoFile: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('photoFile', {
      storage: memoryStorage(),
      limits: { fileSize: DEFAULT_MAX_UPLOAD_SIZE_BYTES },
    }),
  )
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCarDto,
    @UploadedFile() photoFile?: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ) {
    return this.carsService.update(user.id, id, dto, photoFile);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.carsService.remove(user.id, id);
  }

  @Patch(':id/mileage')
  updateMileage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCarMileageDto,
  ) {
    return this.carsService.updateMileage(user.id, id, dto);
  }
}
