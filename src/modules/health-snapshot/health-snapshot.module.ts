import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { HealthSnapshotController } from './health-snapshot.controller';
import { HealthSnapshotService } from './health-snapshot.service';

@Module({
  imports: [DocumentsModule],
  controllers: [HealthSnapshotController],
  providers: [HealthSnapshotService],
  exports: [HealthSnapshotService],
})
export class HealthSnapshotModule {}
