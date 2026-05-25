import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { DocumentsService } from './documents.service';
import { RenewDocumentDto } from './dto/renew-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('cars/:carId/documents')
  findByCar(@CurrentUser() user: AuthenticatedUser, @Param('carId') carId: string) {
    return this.documentsService.findByCar(user.id, carId);
  }

  @Get('documents/:id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.documentsService.findOne(user.id, id);
  }

  @Patch('documents/:id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(user.id, id, dto);
  }

  @Post('documents/:id/renew')
  renew(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RenewDocumentDto) {
    return this.documentsService.renew(user.id, id, dto);
  }
}
