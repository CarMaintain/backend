# MaintainCar Backend

NestJS backend for the Moroccan car maintenance MVP. This API is intended to become the source of truth for the existing Expo React Native app.

## Stack

- NestJS + TypeScript
- PostgreSQL
- Prisma
- JWT access and refresh tokens
- Swagger/OpenAPI
- class-validator / class-transformer
- bcrypt
- ConfigModule

## Install

```bash
npm install
```

## Environment

```bash
cp .env.example .env
```

Fill:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/maintaincar
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
PORT=3000
CORS_ORIGIN=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=maintaincar-uploads
MAX_UPLOAD_SIZE_MB=8
```

## Database

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

Seed user:

```text
email: test@maintaincar.ma
password: password123
```

## Run

```bash
npm run start:dev
```

Swagger:

```text
http://localhost:3000/api/docs
```

## Sample Auth Flow

1. `POST /auth/register`
2. `POST /auth/login`
3. Use `data.accessToken` as `Authorization: Bearer <token>`
4. `POST /auth/refresh` with `refreshToken`
5. `POST /auth/logout` with `refreshToken`

## Main API Overview

- Auth: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`
- Cars: `/cars`, `/cars/:id`, `/cars/:id/mileage`
- Documents: `/cars/:carId/documents`, `/documents/:id`, `/documents/:id/renew`
- Maintenance: `/cars/:carId/maintenance-items`, `/cars/:carId/maintenance-records`, `/maintenance-records/:id`, `/maintenance-items/:id`
- Uploads: `/uploads/photos`
- Mileage: `/cars/:carId/mileage-updates`
- Reminders: `/cars/:carId/reminder-settings`, `/reminder-settings`
- Health snapshot: `/cars/:carId/health-snapshot`
- Export data: `/cars/:carId/export-data`

## Product Rules Covered

- Legal papers: assurance, vignette, visite technique, optional carte grise.
- Maintenance presets are generated when a car is created.
- Maintenance records are the source of truth for service history.
- Photo uploads for papers and maintenance receipts go through Supabase Storage and the returned public URL can be saved in `photoUrl` or `receiptPhotoUrl`.
- Maintenance items are recalculated from records and default/custom intervals.
- Clutch and flywheel are always watchlist-only and never get fixed replacement mileage/date.
- Users can only access their own cars and related records.

## Later Work

- Connect the Expo app to these endpoints.
- Add notification delivery jobs for reminders.
- Add more integration/e2e tests with a test database.
- AI/OCR, garage marketplace, fuel tracking, GPS, OBD, chatbot, fleet mode, and payments are intentionally not implemented yet.
