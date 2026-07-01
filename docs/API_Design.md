# API Design

The API should support trusted master-data seeding, normal upload validation against database masters, owner and truck CRUD, settings, and future payment generation.

Payment generation is still future work and should not be implemented in V1 documentation updates.

## Master Data Seeder APIs

The current implementation is backend-only and exposed as a manual seed script rather than a public HTTP API.

- `npm run seed:master-data -w backend/server`

Seed output:

- `seedRunId`
- `status`
- `summary`
- `sheetSummaries`
- `skippedRows`
- `conflicts`
- `reportFilePath`

The seed runner reads the trusted workbooks from `analysis_input/`, extracts truck-owner-PAN mappings, normalizes them, and upserts `OwnerMaster` and `TruckMaster`.

## Upload Import APIs

## `POST /api/master-imports/preview`

Uploads a normal truck-load Excel file, parses rows, and validates them against `TruckMaster` and `OwnerMaster`.

Request:

- Multipart form data
- `file`: `.xlsx` or `.xls`
- `gstRate`: optional, default `18`

Response:

- `fileName`
- `gstRate`
- `rowCount`
- `status`
- `sheetSummaries`
- `messages`
- `rows`
- `mismatches`
- `requiredActions`

## `POST /api/master-imports/:id/review`

Returns the editable review payload for a previewed import.

This endpoint exists to make the review stage explicit in the daily workflow.

Response:

- `importId`
- `rows`
- `messages`
- `mismatches`
- `editableFields`
- `requiredActions`

## `POST /api/master-imports/save`

Saves a reviewed import after mismatch actions are selected.

Request body:

- `fileName`
- `gstRate`
- `rows`
- `messages`
- `mismatchActions`
- `status`

Response:

- `id`
- `fileName`
- `rowCount`
- `status`
- `createdAt`

## `POST /api/master-imports/:id/apply-actions`

Applies user decisions for mismatch rows.

Supported actions:

- `update_master`
- `keep_existing`
- `skip_row`
- `cancel_import`

Response:

- `importId`
- `updatedMasterCount`
- `keptExistingCount`
- `skippedCount`
- `status`

## `GET /api/master-imports`

Lists recent imports.

## `GET /api/master-imports/:id`

Returns full import details, row validation messages, mismatches, and source sheet summaries.

## Owner Master APIs

## `GET /api/owners`

Searches owner master data.

Query options:

- `q`
- `status`
- `pan`

## `POST /api/owners`

Creates an owner.

## `PATCH /api/owners/:id`

Updates owner name, PAN, GST applicability, TDS settings, commission settings, status, or future contact details.

## `DELETE /api/owners/:id`

Soft deletes an owner by setting `status` to `deleted`.

## Truck Master APIs

## `GET /api/trucks`

Searches truck master data.

Query options:

- `q`
- `status`
- `ownerId`

## `POST /api/trucks`

Creates a truck and links it to an owner.

## `PATCH /api/trucks/:id`


Previews owner grouping and totals without creating an Excel file.

## `POST /api/payment-runs`

Creates a payment generation run.

## `GET /api/payment-runs/:id`

Returns generated run details.

## `GET /api/payment-runs/:id/download`

Downloads the generated workbook.

## Error Shape

All API errors should use:

```json
{
  "message": "Human readable message",
  "details": []
}
```

## Design Notes

- Keep seeding, parsing, validation, master-data updates, and payment generation as separate services.
- Controllers should orchestrate request and response only.
- Seeder APIs should be restricted to admin users once authentication exists.
- Normal upload preview must validate against database masters.
- Master updates from upload mismatches must require explicit user action.
- The review stage should always sit between preview and save.
- Every service should be testable without Excel file IO by accepting parsed rows or extracted mappings.
- The trusted seeder is manual and one-time bootstrap oriented, not part of the normal upload API flow.
## Authentication APIs

All APIs except `POST /api/auth/login` and `GET /health` must require a valid JWT bearer token.

## `POST /api/auth/login`

Authenticates an existing user. Registration is intentionally not supported in Phase 1.

Request body:

```json
{
  "usernameOrEmail": "admin",
  "password": "Admin@12345"
}
```

Response:

```json
{
  "token": "jwt-access-token",
  "user": {
    "id": "user-id",
    "name": "System Admin",
    "email": "admin@example.com",
    "username": "admin",
    "role": "admin",
    "isActive": true,
    "permissions": []
  }
}
```

Errors:

- `400` for missing username/email or password.
- `401` for invalid credentials.
- `403` for inactive user accounts.

## Authentication Headers

Protected API requests must include:

```text
Authorization: Bearer <token>
```

## Role Design

Current roles:

- `admin`
- `operator`

Admin permissions:

- Manage Users
- Manage Truck Master
- Manage Owner Master
- Upload Master Excel
- Validate Data
- Generate Payment Sheets
- Change Settings

Operator permissions:

- Upload Master Excel
- Review Data
- Generate Payment Sheet

Future roles should be added through shared role constants and middleware instead of hardcoded controller checks.

## Master Excel Upload APIs

All endpoints require JWT authentication.

- `POST /api/master-imports/preview` - upload Excel, parse rows, validate against master data, create preview session.
- `GET /api/master-imports` - list import history.
- `GET /api/master-imports/:id` - get session details and rows.
- `PATCH /api/master-imports/:id/rows/:rowId` - edit normalized row values and revalidate.
- `POST /api/master-imports/:id/rows/:rowId/approve` - approve one row.
- `POST /api/master-imports/:id/rows/:rowId/reject` - reject one row.
- `POST /api/master-imports/save` - mark reviewed session saved.
- `POST /api/master-imports/:id/cancel` - cancel the session.

The preview endpoint creates an import session immediately so edits/approvals are tracked against a durable session.
