# Truck Load Payment Sheet System

MERN monorepo for importing truck-load Excel files, validating master data, and preparing for future payment sheet generation.

## What is included

- npm workspace monorepo with `backend/server`, `frontend/client`, and `shared/utils`
- Express API with MongoDB connection
- JWT authentication with bcrypt password hashing
- Admin/operator role constants and reusable role middleware
- Protected API middleware
- Default admin seed script
- Excel upload preview endpoint protected by JWT
- Workbook parser that scans all sheets and detects likely master-data columns
- Validation for missing truck number, owner name, suspicious PAN/GST, and truck-owner mismatches
- React login page, protected route, auth context, logout, and token persistence
- Tests for auth, JWT middleware, parser, validation, and protected Excel preview/save path
- Trusted master-data seeder for the `analysis_input/` workbooks
- Seed report JSON written to `backend/server/logs/`

## Setup

```bash
npm install
cp backend/server/.env.example backend/server/.env
npm run seed:admin -w backend/server
npm run seed:master-data -w backend/server
npm run dev
```

Start MongoDB locally, or update `MONGODB_URI` in `backend/server/.env`.

Backend: `http://localhost:5000`  
Frontend: `http://localhost:5173`

## Default Login

The seed script creates one admin user if it does not already exist.

```text
Username: admin
Email: admin@example.com
Password: Admin@12345
```

Change these values in `backend/server/.env` before seeding in a real environment.

## Environment Variables

Backend (`backend/server/.env`):

- `PORT` - Express server port, default `5000`
- `MONGODB_URI` - MongoDB connection string
- `CLIENT_ORIGIN` - React app origin for CORS, default `http://localhost:5173`
- `MAX_UPLOAD_MB` - maximum Excel upload size, default `10`
- `JWT_SECRET` - long random secret used to sign JWTs
- `JWT_EXPIRES_IN` - access token expiry, default `1d`
- `DEFAULT_ADMIN_NAME` - seeded admin display name
- `DEFAULT_ADMIN_EMAIL` - seeded admin email
- `DEFAULT_ADMIN_USERNAME` - seeded admin username
- `DEFAULT_ADMIN_PASSWORD` - seeded admin password before hashing

Frontend:

- `VITE_API_BASE_URL` - backend URL, default `http://localhost:5000`

## Authentication Flow

1. User logs in at the frontend login page.
2. Backend validates username/email and password.
3. Password is checked with bcrypt against the stored hash.
4. Backend returns a JWT and safe user profile.
5. Frontend stores auth data in `localStorage`.
6. Protected API calls send `Authorization: Bearer <token>`.
7. Logout clears local auth data.

## API

Public:

- `POST /api/auth/login` - returns JWT and user profile
- `GET /health` - server health check

Protected:

- `POST /api/master-imports/preview` - multipart upload with `file` and optional `gstRate`; returns parsed rows and validation messages without saving
- `POST /api/master-imports/save` - saves previewed rows and upload metadata to MongoDB
- `GET /api/master-imports` - lists recent saved imports

## Tests

```bash
npm test
```

The tests cover login, invalid password, invalid user, protected route behavior, JWT middleware, parser, validation, protected Excel preview/save API path, and the trusted master-data seeder helpers.

## Trusted Seeder

The manual seeder reads the trusted workbook files in `analysis_input/`:

- `PURULIA TRUCK LOAD DETAILS (2026-27).xlsx`
- `SHREE PURULIA PAYMENT (2026-27).xlsx`

It extracts truck numbers, owner names, and PAN values, normalizes them, skips duplicates safely, upserts `OwnerMaster` and `TruckMaster`, and writes a JSON report to `backend/server/logs/`.
The payment workbook is used only to enrich owner records with trusted PAN and company details.

Run it with:

```bash
npm run seed:master-data -w backend/server
```

## Master Management & Payments

The system supports a fully integrated master data configuration and payment worksheet generation workflow:

1. **Dashboard & Metrics**: Monitor active/inactive counts, PAN/TDS completeness, and resolve configuration errors.
2. **Owners Management**: Register owner details, validate PANs, override TDS percentages, and map custom truck-wise commission tables.
3. **Truck Mapping**: Add new active trucks and link them to owners. Uniqueness of active truck licenses is enforced.
4. **Payment Preparation Review**: Audit active configurations, view affected transaction rows, and track readiness indicators.
5. **Unified Search**: Search details across all tables simultaneously.
6. **Payment Generation**: Merges cargo details by owner + truck + date, calculates dynamic payouts, applies rounding rules, and exports Excel workbooks with formulas.


## Master Excel Upload

The current upload workflow:

1. **Login**: Authenticate with admin or operator credentials.
2. **Select Context**: Choose transport company, client company, and plant before uploading.
3. **Upload**: Upload master Excel workbook with truck load data.
4. **Preview**: Verify parsed rows in `ParsedDataTable` with validation status badges.
5. **Interactive Editor**: Select any row to open the `ImportRowEditor` with:
   - Dynamic validation badges on each field label.
   - Severity-colored inline validation message lists.
   - Dual display showing raw expression value for diesel inputs alongside computed results.
   - Automatic re-evaluation of arithmetic expressions (e.g. `12+25`) for diesel.
   - Automatic sum re-calculation of RFID and GPS tag fields into combined `RFID_GPS`.
6. **Session Synchronization**: Modifying any row re-validates that row against the seeded `TruckMaster` and `OwnerMaster` database, updates `editedValues` for auditing, and updates import session counts.
7. **Final Save**: Approve/reject rows and save the import session metadata.

## Client Company to Plant Relationship

Plants now belong to a client company. During creation and editing, users first choose a client company and then select the relevant plant. The plant dropdown is filtered by the selected client company, and the same relationship is stored on each imported row and used for downstream payment selection.

## Imported Data Center

The imported transaction dataset is now treated as a first-class operating surface. Users can search, filter, sort, paginate, inline-edit, bulk-edit, approve, reject, and review imported rows from a dedicated imported-data workflow rather than relying on import history alone.

## Payment Filtering Workflow

Payment generation now starts from transport company, client company, plant, and date range. Only imported rows that match the selected context are eligible for owner grouping and payout preparation, while the existing payout math remains unchanged.

