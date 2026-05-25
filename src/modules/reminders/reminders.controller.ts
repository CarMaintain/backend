import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreateReminderSettingDto } from './dto/create-reminder-setting.dto';
import { UpdateReminderSettingDto } from './dto/update-reminder-setting.dto';
import { RemindersService } from './reminders.service';

@ApiTags('reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('cars/:carId/reminder-settings')
  findByCar(@CurrentUser() user: AuthenticatedUser, @Param('carId') carId: string) {
    return this.remindersService.findByCar(user.id, carId);
  }

  @Post('reminder-settings')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReminderSettingDto) {
    return this.remindersService.create(user.id, dto);
  }

  @Patch('reminder-settings/:id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateReminderSettingDto) {
    return this.remindersService.update(user.id, id, dto);
  }
}
