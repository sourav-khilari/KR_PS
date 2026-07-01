# Payment Generation Rules

Payment generation is fully implemented using dynamic, user-configured master settings and global configurations.

## Generation Inputs

The payment generation engine uses:

- Approved load rows from the database (grouped by owner, truck, and date)
- `TruckMaster` references for truck-owner relationships and active status
- `OwnerMaster` references for owner name, PAN, TDS percentage, and commission rules
- Application settings for company name, GSTIN, plant name, GST rates, and rounding rules
- User-selected payment period (start date to end date)
- Optional owner filters


## Sheet And Block Layout

- A payment workbook can contain multiple period sheets.
- A sheet can contain one owner block or multiple owner blocks.
- Owner-specific Balaji sheets use one owner block only.
- Multi-owner period sheets repeat the complete owner header, table header, total row, and summary section for every owner.

## Owner Block Header

Each owner block should contain:

- Company name and company GSTIN line
- `Truck Owner Name : <owner name>`
- Plant text: `SHREE CEMENT LTD., PURULIA`
- `PAN NO: <owner pan>`
- `PAYMENT SHEET FROM <start date> TO <end date>`

Observed formatting:

- Header rows use merged cells.
- Main title spans across the table width.
- Owner and PAN labels are left aligned.
- Plant and payment-period text are centered over mid columns.

## Detail Row Mapping

| Payment Column | Source |
| --- | --- |
| Sl | Generated per owner block |
| Date | Master import `INV DATE.` |
| Truck No | Master import `TRUCK NO.` |
| Party Name | Master import `DEPOT/PARTY'S NAME` |
| Dest. | Master import `DESTINATION` |
| Qty | Master import `QTY` |
| Rate | Master import `FRT-PMT` |
| Amount | Calculated `Qty * Rate` |
| Less: Comm | `OwnerMaster.commissionSettings` or default application setting |
| Gross | Calculated `Amount - Less: Comm` |
| Short/RFID/GPS/TDS column | Depends on block type or template |
| Diesel | Parsed diesel amount, not diesel litres |
| Date of Cash Adv | Load date or explicit advance date if later added |
| Cash Adv | Master import `LESS: ADVANCE` |
| Less: RFID & GPS / Less: TDS | Depends on block type or template |
| Net Amt | Calculated row net |

## Summary Formula Pattern

After the detail rows:

- `Total:` row sums detail columns F, H, I, J, K, L, N, O, and P.
- `TAXABLE VALUE` references total gross.
- `ADD: CGST @9%` uses taxable value times 9%.
- `ADD: SGST @9%` equals CGST.
- `NET BILL AMOUNT` equals taxable value plus CGST plus SGST.
- `LESS: DIESEL` references total diesel.
- `LESS: CASH ADVANCE` references total cash advance.
- `LESS: TDS` uses `ROUND(Taxable Value * TDS rate, 0)`.
- `NET PAYABLE` subtracts diesel, cash advance, TDS, and other deductions from net bill amount, while adding any GST payable or adjustment row when applicable.

## GST Rules

- Default GST rate is 18%.
- Current format splits GST into CGST 9% and SGST 9%.
- GST rate should be configurable from application settings.
- GST should be calculated on taxable value, which is total gross.

## TDS Rules

- Observed standard owner blocks use 1% TDS.
- Observed Balaji owner blocks use 2% TDS.
- TDS rate must come from `OwnerMaster.tdsRate` with application settings as fallback.
- TDS formula should round to the nearest whole rupee.

## Commission Rules

- Commission belongs to Owner Settings.
- Support percentage, fixed, and truck-wise commission modes.
- Commission should be applied once per merged truck and date group.
- Commission must not be hardcoded in the payment writer.

## Merge Rule

If the same Truck Number has multiple rows on the same date, merge them into a single payment-sheet row and apply commission only once.

## Formatting Rules

Future generation should preserve:

- Repeated owner block layout
- Merged header ranges
- Bold table headers
- Bordered table and summary cells
- Column widths close to the source format
- Date and numeric formats
- Blank spacing rows between blocks

## Master Data Dependency

Payment generation must use approved database master data. Raw uploaded truck-owner values should not drive payment blocks unless the user selected `Update Master` during import review and the master records were updated successfully.

## Not Yet Implemented

- Payment sheet generation
- Excel template writer
- Owner block pagination and print setup
- Manual adjustment workflow
- GST payable and other deduction row labeling