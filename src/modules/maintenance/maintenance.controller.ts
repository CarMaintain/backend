import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceItemDto } from './dto/update-maintenance-item.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';
import { MaintenanceService } from './maintenance.service';

@ApiTags('maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('cars/:carId/maintenance-items')
  findItemsByCar(@CurrentUser() user: AuthenticatedUser, @Param('carId') carId: string) {
    return this.maintenanceService.findItemsByCar(user.id, carId);
  }

  @Patch('maintenance-items/:id')
  updateItem(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateMaintenanceItemDto) {
    return this.maintenanceService.updateItem(user.id, id, dto);
  }

  @Post('cars/:carId/maintenance-items/regenerate')
  regenerateItems(@CurrentUser() user: AuthenticatedUser, @Param('carId') carId: string) {
    return this.maintenanceService.regenerateItems(user.id, carId);
  }

  @Get('cars/:carId/maintenance-records')
  findRecordsByCar(@CurrentUser() user: AuthenticatedUser, @Param('carId') carId: string) {
    return this.maintenanceService.findRecordsByCar(user.id, carId);
  }

  @Post('cars/:carId/maintenance-records')
  createRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Param('carId') carId: string,
    @Body() dto: CreateMaintenanceRecordDto,
  ) {
    return this.maintenanceService.createRecord(user.id, carId, dto);
  }

  @Get('maintenance-records/:id')
  findRecord(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.maintenanceService.findRecord(user.id, id);
  }

  @Patch('maintenance-records/:id')
  updateRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceRecordDto,
  ) {
    return this.maintenanceService.updateRecord(user.id, id, dto);
  }

  @Delete('maintenance-records/:id')
  removeRecord(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.maintenanceService.removeRecord(user.id, id);
  }
}
