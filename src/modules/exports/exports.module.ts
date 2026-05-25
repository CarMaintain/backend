import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  imports: [DocumentsModule],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
