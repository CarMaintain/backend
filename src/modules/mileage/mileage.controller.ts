import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreateMileageUpdateDto } from './dto/create-mileage-update.dto';
import { MileageService } from './mileage.service';

@ApiTags('mileage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cars/:carId/mileage-updates')
export class MileageController {
  constructor(private readonly mileageService: MileageService) {}

  @Get()
  findByCar(@CurrentUser() user: AuthenticatedUser, @Param('carId') carId: string) {
    return this.mileageService.findByCar(user.id, carId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Param('carId') carId: string, @Body() dto: CreateMileageUpdateDto) {
    return this.mileageService.createForOwnedCar(user.id, carId, dto);
  }
}
