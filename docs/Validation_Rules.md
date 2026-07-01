# Validation Rules

## Corrected Validation Model

Trusted Excel files seed `TruckMaster` and `OwnerMaster` first. After that seed, uploaded master/load files are validated against the database.

The database is the source of truth during normal imports.

## Master Seeder Validation

The trusted seeder should validate extracted truck-owner-PAN mappings before creating or updating master records.

Seeder checks:

- Truck number is present and normalized.
- Owner name is present and normalized.
- PAN is normalized and validated when present.
- The same truck number does not map to multiple owners without admin review.
- The same PAN does not map to materially different owner names without admin review.
- The same owner name does not map to multiple PANs without admin review.
- Existing `TruckMaster` and `OwnerMaster` records are updated instead of duplicated.

Seeder result statuses:

- `created`
- `updated`
- `unchanged`
- `skipped`
- `conflict`

## Uploaded Master File Validation

Mandatory fields from uploaded truck-load files:

- `INV NO.`
- `INV DATE.`
- `DEPOT/PARTY'S NAME`
- `DESTINATION`
- `TRUCK NO.`
- `TRUCK OWNER NAME`
- `QTY`
- `FRT-PMT`

Conditionally mandatory fields:

- `PAN NO` is required before payment generation, but uploads may be previewed with missing PAN warnings.
- `BILL NO` and `BILL DATE` are mandatory if payment sheets need bill traceability.
- `LESS: DIESEL(Ltr)` is not used to calculate the stored diesel amount.
- `LESS: ADVANCE` is required only when advance was paid.
- `RFID TAG`, `GPS INSTALL`, `UREA`, and `BAG SHORTAGE` are optional deductions.

Optional fields:

- `GR/RR NO.`
- `DI NO.`
- `PODUCT NAME`
- `RFID TAG`
- `GPS INSTALL`
- `UREA`
- `BAG SHORTAGE`

## Database Match Rules

For each uploaded row:

- Normalize `TRUCK NO.` and search `TruckMaster.truckNo`.
- If no truck exists, show a warning and require a user action.
- If the truck exists, load its linked `OwnerMaster`.
- Compare uploaded owner name against `OwnerMaster.ownerName`.
- Compare uploaded PAN against `OwnerMaster.pan` when uploaded PAN is present.
- If owner or PAN differs, show a mismatch warning.

Mismatch examples:

- Uploaded truck exists in `TruckMaster`, but uploaded owner name is different.
- Uploaded truck exists, but uploaded PAN differs from `OwnerMaster.pan`.
- Uploaded owner name exists, but the truck is linked to another owner.
- Uploaded truck does not exist in `TruckMaster`.

## User Actions For Mismatches

The user must choose one of these actions for mismatch rows:

- `Update Master`: update `TruckMaster` and/or `OwnerMaster` using the uploaded values after confirmation.
- `Keep Existing`: use existing database master data and keep the uploaded row as a transaction row.
- `Skip Row`: exclude the row from the import/payment workflow.
- `Cancel Import`: cancel the whole import and make no database changes.

Action rules:

- `Update Master` should be audited.
- `Keep Existing` should preserve uploaded raw values for traceability.
- `Skip Row` should keep a skipped-row record in the import result.
- `Cancel Import` should not partially save rows.

## Data Type Rules

- Truck number must be text and normalized to uppercase without extra spaces or punctuation.
- Owner name must be text, trimmed, and compared through a normalized form.
- PAN must match Indian PAN format: `AAAAA9999A` when present.
- Dates must be valid Excel dates or parseable date values.
- Quantity, rate, amount, diesel, advance, RFID/GPS, TDS, and shortage values must be numeric and non-negative unless a manual adjustment is explicitly supported.
- Invoice number, GR/RR number, DI number, bill number, and truck number must remain text identifiers.

## Diesel Rule

The parser must treat the source column `DIESEL AMOUNT` as the raw diesel input.

Examples:

`12+25` -> `37`

`100+25+10` -> `135`

Store both values:

- `dieselAmountRaw`
- `dieselAmount`

Do not calculate diesel amount from diesel litres.

## RFID And GPS Rules

Store:

- `RFID`
- `GPS`
- `RFIDGPS`

Where:

- `RFIDGPS = RFID + GPS`

Payment sheets should use `RFIDGPS`.

## Commission And TDS Rules

Commission belongs to Owner Settings.

Support these commission modes:

- Percentage
- Fixed
- Truck Wise

TDS also belongs to Owner Settings.

Every owner may have a different TDS percentage.

## Cross-Field Rules

- Freight amount should equal `QTY * FRT-PMT`.
- If freight amount differs from `QTY * FRT-PMT`, flag as a warning unless the row is marked manually adjusted.
- Payment generation must use master owner/truck values after validation decisions are applied.

## Payment Sheet Validation

Before generation, each payment line needs:

- Date
- Truck number mapped to `TruckMaster`
- Owner mapped to `OwnerMaster`
- Owner PAN
- Party name
- Destination
- Quantity
- Rate

Each generated owner block should validate:

- All rows in the block belong to the same `OwnerMaster`.
- The owner header PAN matches `OwnerMaster.pan`.
- Table totals equal the sum of detail rows.
- `Taxable Value` equals total gross.
- `CGST + SGST` equals GST amount using the configured GST rate.
- TDS uses `OwnerMaster.tdsRate` or fallback settings.
- Commission uses owner or truck-wise settings.
- Net payable matches the summary formula.

## Duplicate Rules

- Duplicate invoice number should be blocked unless importing an amendment.
- Same truck, same invoice date, same party, same quantity, and same rate should be warned as a possible duplicate.
- Same normalized truck number should not create multiple `TruckMaster` records.
- Same PAN should not create multiple `OwnerMaster` records.
- Same owner name with multiple PANs should be blocked before payment generation unless explicitly resolved.

Duplicate warnings are non-blocking by default and should surface the available user actions.

## Severity Levels

- Error: missing truck number, missing owner, invalid numeric field, invalid date, duplicate invoice, unresolved owner PAN conflict.
- Warning: missing PAN during import, suspicious PAN format, amount mismatch, truck-owner mismatch, truck not found in master, owner mismatch, missing optional deduction values.
- Info: sheet skipped because no recognizable headers were found.
## Master Upload Validation

Uploaded rows are validated against seeded `TruckMaster` and `OwnerMaster`.

Validation rules:

- Truck number is required.
- Truck number must exist in `TruckMaster`.
- Owner name is required.
- Uploaded owner must match the owner linked to the truck.
- PAN is normalized to uppercase.
- Uploaded PAN should match `OwnerMaster.panNumber`.
- Quantity is numeric when present.
- Rate is numeric when present.
- Freight amount is checked against `Qty * Rate`.
- Diesel amount is parsed as entered; additive expressions such as `100+25+10` are supported.
- Missing/blank source columns create warnings.

Validation severities:

- `error`: blocks clean approval until edited or rejected.
- `warning`: visible to user but not always blocking.
- `info`: non-blocking contextual message.

The system must not silently overwrite seeded master data during upload validation.

## Row Editing Validation & Recalculation Rules

When a user edits imported rows in the UI editor:
1. **Field Normalization**: Edits to fields like `truckNo` and `panNo` are automatically normalized (capitalized, whitespace trimmed).
2. **RFID and GPS Combined Value**: Whenever `rfidTag` or `gpsInstall` is edited by the user, the system automatically recalculates the combined fields `rfid` (set to `rfidTag`), `gps` (set to `gpsInstall`), and `rfidGps`/`RFID_GPS` as the arithmetic sum of the two.
3. **Diesel Expression Re-evaluation**: Edits to the `dieselAmount` field support additive expressions (e.g. `12+25`). The system evaluates the expression, saves the arithmetic total in `dieselAmount`, and preserves the user's raw input expression in `dieselAmountRaw` for future reference.
4. **Validation Re-run**: Upon saving edits to a row, the validation service comparison matches are re-executed against `TruckMaster` and `OwnerMaster` to update the row's `validationMessages`, `editStatus` (set to `edited`), and reset `approvalStatus` to `pending`.
5. **Session Count Updates**: Changing any row's validation state automatically refreshes the aggregate import session's `rowCount`, `validRowCount`, `warningCount`, and `errorCount`.

## Master Management Validation Rules

### Owner Master Validation
- **Owner Name**: Mandatory, trimmed, and normalized. Cannot be blank.
- **PAN Format**: Must match the Indian Income Tax PAN regex `^[A-Z]{5}[0-9]{4}[A-Z]$`. It is case-insensitive during input and normalized to uppercase on save.
- **PAN Uniqueness**: No two active owners can share the same non-empty PAN.
- **TDS Percentage**: Must be a number between `0` and `100` inclusive.
- **Commission Type**: Must be one of `fixed`, `percentage`, or `truck_wise`.
- **Commission Value**: Must be a non-negative number. If `commissionType` is `percentage`, value must not exceed `100`.
- **Truck-wise Map**: Mapped values must be non-negative numbers.

### Truck Master Validation
- **Truck Number**: Mandatory. Normalized by converting to uppercase and stripping all whitespaces.
- **Active Uniqueness**: No two active trucks can have the same normalized truck number.
- **Owner ID Reference**: Must be a valid, existing `OwnerMaster` ID in the database.

### Settings Validation
- **Company Name**: Mandatory.
- **GST Rate**: Must be a number between `0` and `100`.
- **CGST/SGST Splits**: Must be half of the main GST rate.
- **Rounding Rule**: Must be one of `round`, `ceil`, or `floor`.


