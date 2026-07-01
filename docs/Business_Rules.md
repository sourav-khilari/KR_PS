# Business Rules

## Source of Truth

The provided Excel files are trusted reference files for initial system setup only.

Trusted seed files:

- `PURULIA TRUCK LOAD DETAILS (2026-27).xlsx`
- `SHREE PURULIA PAYMENT (2026-27).xlsx`

After the one-time seed run:

- `TruckMaster` and `OwnerMaster` become the operational source of truth.
- Uploaded Excel files are treated as normal imports, not master records.
- Users may suggest master-data changes during review, but those changes must be explicit and auditable.

## Master Data Seeder

The trusted seeder is a separate admin/setup process.

Seeder responsibilities:

- Read both trusted Excel files from `analysis_input/`.
- Extract unique truck number values.
- Extract truck owner names.
- Extract PAN values.
- Normalize truck numbers, owner names, and PAN values.
- Populate `TruckMaster`.
- Populate `OwnerMaster`.
- Skip duplicates safely.
- Produce an import report with created, updated, skipped, and conflicted records.
- Use the payment workbook only for owner enrichment, not transaction import.

Seeder conflict examples:

- One truck number maps to multiple owners.
- One PAN maps to materially different owner names.
- One owner name maps to multiple PANs.

Seeder execution rules:

- Use the trusted workbook files in `analysis_input/` only.
- Seed runs may be repeated safely; duplicate truck or owner records should be updated only when the trusted source clearly contains a better current value.
- Each seed run must write a report file and a `MasterSeedRun` database record.
- Every created or updated master record must retain source file, sheet, and row metadata for auditability.

Conflicts should be reported for review instead of being guessed.

## Normalization Rules

Truck number:

- Trim spaces.
- Convert to uppercase.
- Remove internal spacing and punctuation for matching.
- Preserve the original display value separately when needed.

Owner name:

- Trim spaces.
- Collapse repeated spaces.
- Compare by uppercase normalized form.
- Preserve original display casing separately when needed.

PAN:

- Trim spaces.
- Convert to uppercase.
- Validate against the Indian PAN format before treating it as trusted.

## Daily Workflow

The normal workflow must be:

Login

↓

Upload Truck Load Excel

↓

Parse

↓

Normalize

↓

Validate against Truck Master and Owner Master

↓

Review Screen

↓

User Edit

↓

Approve

↓

Save

↓

Generate Payment Sheet

The review stage must not be bypassed.

## Validation And User Actions

The normal import flow should warn on:

- Missing or unknown truck number.
- Missing or mismatched owner name.
- Missing, invalid, or conflicting PAN.
- Duplicate rows or suspicious duplicates.

Duplicate warnings should be non-blocking by default.

Users must be able to choose one of these actions for a flagged row:

- `Update Master`
- `Keep Existing`
- `Skip Row`
- `Cancel Import`

Action rules:

- `Update Master` is auditable and updates master data only after confirmation.
- `Keep Existing` uses the current master record and keeps the imported transaction row.
- `Skip Row` excludes the row from the import/payment workflow.
- `Cancel Import` stops the import and saves no partial changes.

## Calculations And Stored Values

Master data:

- Truck number
- Truck owner name
- Owner PAN
- Owner GSTIN if later available
- Owner TDS rate/category
- Owner GST applicability
- Truck-owner mapping

Transaction/import data:

- Invoice number
- Invoice date
- GR/RR number
- DI number
- Party/depot name
- Destination
- Product name
- Quantity
- Freight rate
- Bill number/date
- RFID
- GPS
- RFIDGPS
- Diesel amount raw
- Diesel amount
- Advance
- Urea
- Bag shortage

Generated values:

- Payment sheet workbook/sheet names
- Owner payment blocks
- Serial numbers
- Table total rows
- GST summary rows
- TDS rows
- Net payable rows

Calculated values:

- Freight amount
- Commission
- Gross
- Taxable value
- CGST
- SGST
- TDS
- Net bill amount
- Net payable

## Application Settings

- Company name
- Company GSTIN
- Plant/location label
- Default GST rate, currently 18%
- CGST/SGST split, currently 9% + 9%
- Default diesel rate by date or period
- Owner commission rules
- Owner TDS rules
- Output formatting/template version

## Operational Rule

The database is the source of truth during normal imports. The seed Excel files are only the initial baseline for creating master records.
## Master Excel Upload Workflow

The master Excel upload module is for import and review only. It does not generate payment sheets and does not overwrite seeded master data.

Workflow:

1. User uploads the truck load master Excel workbook.
2. Backend scans every relevant worksheet.
3. Parser detects the master header row and reads all detail rows.
4. Every required source column is preserved in `rawRow`.
5. Normalized fields are generated for validation and later payment processing.
6. Rows are validated against seeded `TruckMaster` and `OwnerMaster`.
7. User reviews warnings/errors in the UI.
8. User may edit a row.
9. User approves or rejects rows.
10. User saves or cancels the import session.

The upload module stores blanks as blanks/nulls. It must not invent missing values.

## Raw vs Normalized Data

`rawRow` preserves source Excel values exactly by source header name.

`normalizedRow` stores typed and cleaned values such as:

- normalized truck number
- cleaned owner name
- uppercase PAN
- parsed dates
- numeric quantity/rate/freight values
- `dieselAmountRaw`
- parsed `dieselAmount`
- `rfid`
- `gps`
- `rfidGps`

## Diesel, RFID, and GPS Rules

`DIESEL AMOUNT` is parsed from the source value. Expressions such as `12+25` are stored as:

- `dieselAmountRaw`: `12+25`
- `dieselAmount`: `37`

RFID/GPS fields are stored separately and together:

- `rfid`
- `gps`
- `rfidGps = rfid + gps`

Payment generation later should use `rfidGps`.
