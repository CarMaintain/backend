-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('diesel', 'essence', 'hybrid', 'electric');

-- CreateEnum
CREATE TYPE "Gearbox" AS ENUM ('manual', 'automatic');

-- CreateEnum
CREATE TYPE "VehicleDocumentType" AS ENUM ('assurance', 'vignette', 'visite_technique', 'carte_grise');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('vidange', 'oil_filter', 'air_filter', 'cabin_filter', 'fuel_filter', 'brakes', 'tires', 'battery', 'timing_belt', 'brake_fluid', 'coolant', 'clutch', 'flywheel');

-- CreateEnum
CREATE TYPE "MaintenanceCategory" AS ENUM ('scheduled', 'inspection', 'watchlist');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('due', 'soon', 'ok', 'unknown', 'watch');

-- CreateEnum
CREATE TYPE "MileageSource" AS ENUM ('manual', 'maintenance_record', 'import');

-- CreateEnum
CREATE TYPE "ReminderTargetType" AS ENUM ('document', 'maintenance_item');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "currentMileage" INTEGER NOT NULL DEFAULT 0,
    "fuelType" "FuelType",
    "gearbox" "Gearbox",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "type" "VehicleDocumentType" NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "reminderDaysBefore" JSONB NOT NULL DEFAULT '[30,7,1]',
    "photoUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceItem" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "category" "MaintenanceCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "defaultIntervalKm" INTEGER,
    "defaultIntervalMonths" INTEGER,
    "lastDoneMileage" INTEGER,
    "lastDoneDate" TIMESTAMP(3),
    "nextDueMileage" INTEGER,
    "nextDueDate" TIMESTAMP(3),
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'unknown',
    "hasNeverBeenDone" BOOLEAN NOT NULL DEFAULT true,
    "watchlistSymptoms" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "maintenanceItemId" TEXT,
    "serviceType" TEXT NOT NULL,
    "category" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "mileage" INTEGER,
    "priceMad" DECIMAL(10,2),
    "garageName" TEXT,
    "receiptPhotoUrl" TEXT,
    "notes" TEXT,
    "checklist" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MileageUpdate" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "mileage" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "MileageSource",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MileageUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderSetting" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "targetType" "ReminderTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "daysBefore" JSONB NOT NULL DEFAULT '[30,7,1]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "Car_userId_idx" ON "Car"("userId");

-- CreateIndex
CREATE INDEX "VehicleDocument_carId_idx" ON "VehicleDocument"("carId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleDocument_carId_type_key" ON "VehicleDocument"("carId", "type");

-- CreateIndex
CREATE INDEX "MaintenanceItem_carId_idx" ON "MaintenanceItem"("carId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceItem_carId_type_key" ON "MaintenanceItem"("carId", "type");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_carId_idx" ON "MaintenanceRecord"("carId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_maintenanceItemId_idx" ON "MaintenanceRecord"("maintenanceItemId");

-- CreateIndex
CREATE INDEX "MileageUpdate_carId_idx" ON "MileageUpdate"("carId");

-- CreateIndex
CREATE INDEX "ReminderSetting_carId_idx" ON "ReminderSetting"("carId");

-- CreateIndex
CREATE INDEX "ReminderSetting_targetType_targetId_idx" ON "ReminderSetting"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceItem" ADD CONSTRAINT "MaintenanceItem_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_maintenanceItemId_fkey" FOREIGN KEY ("maintenanceItemId") REFERENCES "MaintenanceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MileageUpdate" ADD CONSTRAINT "MileageUpdate_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderSetting" ADD CONSTRAINT "ReminderSetting_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
