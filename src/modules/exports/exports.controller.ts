import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { ExportsService } from './exports.service';

@ApiTags('exports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cars/:carId/export-data')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get()
  exportData(@CurrentUser() user: AuthenticatedUser, @Param('carId') carId: string) {
    return this.exportsService.exportData(user.id, carId);
  }
}
