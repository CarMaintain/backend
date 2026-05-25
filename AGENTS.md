# AGENTS.md

Guidance for future Codex work in this backend.

## Scope

- Work only inside this `/backend` folder unless the user explicitly changes scope.
- Do not touch the separate Expo app from backend tasks.
- Do not add AI/OCR, garage marketplace, fuel tracking, GPS, OBD, chatbot, fleet mode, or payments without a new explicit request.

## Architecture

- Keep NestJS modules clean and feature-oriented under `src/modules`.
- Controllers should stay thin.
- Business logic belongs in services.
- Prisma schema is the database source of truth.
- Keep user ownership checks in service methods before reading or mutating car-owned data.
- Prefer DTO validation over ad hoc controller validation.

## Domain Rules

- Legal document types are `assurance`, `vignette`, `visite_technique`, and optional `carte_grise`.
- Maintenance records are the source of truth for actual service history.
- Maintenance items are generated and recalculated from rules and records.
- Clutch and flywheel must remain watchlist-only.
- Never assign fixed replacement mileage or date intervals to clutch or flywheel.

## Commands

```bash
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run start:dev
npm run build
npm test
```

## Response Style

Prefer API responses shaped like:

```json
{
  "data": {},
  "message": "Modifications enregistrees."
}
```

Errors should stay compatible with NestJS HTTP exceptions and the global exception filter.
