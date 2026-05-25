import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { HealthSnapshotService } from './health-snapshot.service';

@ApiTags('health-snapshot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cars/:carId/health-snapshot')
export class HealthSnapshotController {
  constructor(private readonly healthSnapshotService: HealthSnapshotService) {}

  @Get()
  getSnapshot(@CurrentUser() user: AuthenticatedUser, @Param('carId') carId: string) {
    return this.healthSnapshotService.getSnapshot(user.id, carId);
  }
}
