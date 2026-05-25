import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './modules/auth/auth.module';
import { CarsModule } from './modules/cars/cars.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ExportsModule } from './modules/exports/exports.module';
import { HealthSnapshotModule } from './modules/health-snapshot/health-snapshot.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { MileageModule } from './modules/mileage/mileage.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    JwtModule.register({ global: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    CarsModule,
    DocumentsModule,
    MaintenanceModule,
    MileageModule,
    RemindersModule,
    UploadsModule,
    HealthSnapshotModule,
    ExportsModule,
  ],
})
export class AppModule {}
