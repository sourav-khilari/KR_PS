# Architecture

## Goal

Freeze the project as a clean npm workspace monorepo with three isolated packages:

- `backend/server` for API, validation, seeding, persistence, and future generation
- `frontend/client` for the UI review and approval workflow
- `shared/utils` for pure reusable helpers only

The current code should remain in place, but the structure should be ready for the next phase without forcing feature implementation now.

## Monorepo Principles

- Keep root dependency orchestration in the top-level `package.json`.
- Avoid introducing parallel dependency manifests for the same runtime concerns.
- Keep backend, frontend, and shared code isolated.
- Place reusable logic in shared modules only when it is framework-neutral.
- Prefer repository/service boundaries over large controllers.
- Keep trusted seeding separate from normal uploads.
- Keep review/approval mandatory for normal uploads.

## Target Workspace Shape

```text
web-kr/
  backend/server/
    src/
      config/
      constants/
      controllers/
      excel/
      helpers/
      jobs/
      logs/
      middleware/
      models/
      modules/
      pdf/
      repositories/
      routes/
      seeders/
      services/
      templates/
      validators/
  frontend/client/
    src/
      components/
      modules/
      services/
  shared/utils/
    src/
```

The new backend folders are reserved for future expansion only. Working code should not be moved unless a later feature needs it.

## Principles

- Treat the trusted Excel files as seed inputs for initial setup only.
- After seeding, the database becomes the source of truth.
- Store both raw imported values and normalized values.
- Use explicit user actions for master-data changes discovered during import review.
- Make validation deterministic and testable outside the UI.
- Keep commission, TDS, GST, and diesel rules configurable.
- Do not bypass the review stage in the daily upload flow.
- Do not implement payment generation until master data and review workflows are stable.

## High-Level Lifecycle

```text
Trusted Excel files
  -> Master Data Seeder
  -> Extract unique truck / owner / PAN mappings
  -> Normalize values
  -> Create or update TruckMaster and OwnerMaster
  -> Persist seed run report

Daily workflow
  Login
    -> Upload Truck Load Excel
    -> Parse
    -> Normalize
    -> Validate against TruckMaster and OwnerMaster
    -> Review Screen
    -> User Edit
    -> Approve
    -> Save
    -> Generate Payment Sheet
```

## Backend Boundaries

- `seeders` owns the one-time trusted master-data seeding flow.
- `excel` owns workbook reading and sheet extraction.
- `validators` owns row and master-data validation rules.
- `repositories` owns database access and query logic.
- `services` coordinates business workflows and transformations.
- `modules` can group future feature slices by domain when the codebase grows.
- `templates` stores generation templates for future payment output.
- `pdf` remains reserved for future export formats.
- `jobs` is reserved for background or scheduled tasks.
- `logs` is reserved for structured operational output and import reporting.

## Frontend Boundaries

- The current UI should keep upload, parse, review, edit, and approval concerns separated.
- The review screen must remain a distinct step, not a hidden background action.
- Future owner/truck master screens should be isolated into feature modules.

## Master Data Seeder Design

The one-time seeder should:

- Read the trusted truck-load workbook and the payment workbook in `analysis_input/`.
- Extract unique truck numbers.
- Extract owner names.
- Extract PAN values.
- Normalize truck numbers, owner names, and PAN values.
- Populate `TruckMaster`.
- Populate `OwnerMaster`.
- Skip duplicates safely.
- Produce an import report with created, updated, skipped, and conflicted records.
- Store a `MasterSeedRun` audit record and a JSON report in `backend/server/logs/`.
- Preserve the source file, sheet, and row number on seeded master records.
- Use the payment workbook only as an owner-enrichment source.

Manual seeding entry point:

- `backend/server/src/seeders/seedMasterData.js`
- npm script: `npm run seed:master-data -w backend/server`

Seeder conflicts must be reported for review instead of being guessed.

## Daily Import Flow

1. User logs in.
2. User uploads a truck-load Excel file.
3. The backend parses the workbook.
4. The backend normalizes truck numbers, owner names, PAN values, and deduction fields.
5. The backend validates rows against `TruckMaster` and `OwnerMaster`.
6. The UI shows a review screen with warnings and actions.
7. The user edits rows or chooses a master-data action.
8. The user approves the reviewed import.
9. The approved data is saved.
10. Payment sheet generation uses only approved data.

## Scalability Notes

- MongoDB is sufficient for V1.
- Add indexes for normalized truck number, normalized owner name, PAN, import ID, date, and owner reference.
- Keep generation-specific formatting logic out of controllers.
- Store seed and import reports as first-class records.
- Use soft delete for truck and owner masters in V1.
- Do not add effective-date ownership logic yet unless the business requires it.
## Authentication Architecture

Phase 1 adds a reusable JWT authentication module used by all future features.

Backend auth files:

```text
backend/server/src
  constants/roles.js
  controllers/auth.controller.js
  middleware/auth.middleware.js
  models/User.js
  routes/auth.routes.js
  seeders/seedAdmin.js
  services/auth.service.js
  validators/auth.validator.js
```

Frontend auth files:

```text
frontend/client/src/modules/auth
  AuthContext.jsx
  LoginPage.jsx
  ProtectedRoute.jsx
```

Authentication flow:

1. User submits username/email and password.
2. Backend validates the request body.
3. Backend finds active user by username or email.
4. Backend compares the submitted password with the stored bcrypt hash.
5. Backend signs a JWT with user ID and role.
6. Frontend stores the token and user profile in `localStorage`.
7. Protected frontend views require an authenticated context.
8. Protected backend APIs require `Authorization: Bearer <token>`.
9. Logout removes the stored token.

Security rules:

- Plain passwords are never stored.
- User passwords are excluded from default query results.
- All APIs except `/api/auth/login` and `/health` should be protected.
- Role checks should use reusable middleware.
- The current JWT structure is refresh-friendly: refresh tokens can be added later without changing controllers that depend on `req.user`.

## Master Excel Upload Architecture

The upload module reuses the existing layered backend structure:

- `excelParser.service` parses workbooks and preserves source columns.
- `loadImport.service` creates sessions, validates rows, handles edits, approvals, rejections, save, and cancel.
- `MasterImport.js` defines `ImportSession` and `LoadRow` models.
- `masterImport.controller` exposes HTTP handlers.
- `masterImport.routes` defines upload/review APIs.

Frontend flow:

- `UploadPage` submits the workbook.
- `ValidationPanel` summarizes messages.
- `ParsedDataTable` previews parsed rows.
- `ImportRowEditor` supports row edit, approve, and reject actions.

Payment generation remains separate and should consume approved `load_rows` later.

### Edit-Tracing and Recalculation Details

1. **State Persistence**: User edits are tracked in a dedicated `editedValues` Mixed field within the `LoadRow` document to maintain an audit trail alongside the original `rawRow` data.
2. **Formula Parsing**: Diesel amount inputs support mathematical expression evaluation (e.g. `12+25`) via `parseAdditiveAmount`. The expression is kept in `dieselAmountRaw` and the sum is calculated into `dieselAmount`.
3. **RFID & GPS Integration**: Any change to `rfidTag` or `gpsInstall` triggers automatic recalculation of the combined `rfid`, `gps`, and `rfidGps` fields inside `normalizedRow`.
4. **Validation Pipeline**: Modifying a row triggers a re-run of `validateRows` against the master database, updating `validationMessages`, marking `editStatus = 'edited'`, and resetting the row's `approvalStatus = 'pending'`.
5. **Session Aggregates**: The import session's aggregate validation numbers (`validRowCount`, `warningCount`, `errorCount`, `rowCount`) are updated instantly upon row modification.

## Master Management & Settings Architecture

The Master Management module provides the administrative control center for payment sheet configurations. It is structured into a sub-navigation layout under the main app container:

- **Dashboard**: Aggregates total metrics and highlights warnings (missing PAN, TDS, commission rules, or owner mappings) using `GET /api/payments/master-prep-summary`. Clicking warnings automatically drills down to correct them.
- **Owners Page & Edit Drawer**: Lists transporters and slides out a right-hand panel for inline edits. It includes:
  - Regex-based PAN pattern validator.
  - TDS rate overrides.
  - Commission modes (`fixed`, `percentage`, or `truck_wise` maps).
- **Trucks Page & Edit Drawer**: Lists registered trucks, normalizes input license plates, and associates each truck with an active owner reference. It enforces uniqueness for active trucks to prevent duplicate payout mappings.
- **Payment Prep Review**: Displays readiness indicators, highlights affected trucks/owners, and calculates a dynamic Master Data Readiness Score.
- **Unified Search**: Allows global searches across owners, trucks, PANs, and rules from a single search bar.
- **Global Settings**: Edits global metadata (CGST/SGST splits, company name, default rounding rule) stored in the `Setting` collection.

### Payment Generation Feed
During payment generation previews or saves, calculations are decoupled from hardcoded defaults. The system reads owner-specific TDS/commission values from `OwnerMaster` and global tax rates from `Setting`. If a truck-wise rule exists, it queries the owner's `truckWiseCommissionMap` using the normalized truck number.


