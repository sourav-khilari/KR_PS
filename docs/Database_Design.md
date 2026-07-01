# Database Design

The database supports trusted master-data seeding, normal uploads validated against master data, user-managed owner and truck records, and payment generation.

## V1 Collections

### `owner_masters`

Stores owner or transporter master records.

Fields:

- `_id`: ObjectId
- `ownerName`: string
- `normalizedOwnerName`: string, uppercase, indexed
- `panNumber`: string, uppercase, default ''
- `mobileNumber`: string, default ''
- `address`: string, default ''
- `tdsPercentage`: number, default 1
- `commissionType`: string ('fixed', 'percentage', 'truck_wise'), default 'fixed'
- `commissionValue`: number, default 0
- `truckWiseCommissionMap`: Map of String (Normalized Truck Number) to Number (Commission Value)
- `status`: string ('active', 'inactive'), default 'active'
- `remarks`: string, default ''
- `createdAt`: date
- `updatedAt`: date

Indexes:
- Unique partial index on `{ panNumber: 1 }` when PAN exists and is not empty.
- Index on `{ normalizedOwnerName: 1 }`.
- Index on `{ status: 1 }`.

### `truck_masters`

Stores truck master records and the current owner reference.

Fields:

- `_id`: ObjectId
- `truckNumber`: string
- `normalizedTruckNumber`: string, uppercase, indexed
- `ownerId`: ObjectId (ref `OwnerMaster`)
- `status`: string ('active', 'inactive'), default 'active'
- `remarks`: string, default ''
- `createdAt`: date
- `updatedAt`: date

Indexes:
- Unique partial index on `{ normalizedTruckNumber: 1 }` for active status.
- Index on `{ ownerId: 1 }`.
- Index on `{ status: 1 }`.

### `settings`

Stores global configurations.

Fields:
- `_id`: ObjectId
- `companyName`: string, default 'SHREE CEMENT LTD.'
- `companyGstin`: string, default ''
- `plantName`: string, default 'PURULIA'
- `gstRate`: number, default 18
- `cgstRate`: number, default 9
- `sgstRate`: number, default 9
- `defaultRoundingRule`: string ('round', 'ceil', 'floor'), default 'round'
- `createdAt`: date
- `updatedAt`: date

### `payment_runs`

Stores metadata for generated payment runs.

Fields:
- `_id`: ObjectId
- `periodStart`: Date
- `periodEnd`: Date
- `status`: string ('draft', 'generated', 'cancelled')
- `totalTaxableValue`: number
- `totalCgst`: number
- `totalSgst`: number
- `totalNetBillAmount`: number
- `totalDiesel`: number
- `totalAdvance`: number
- `totalShortage`: number
- `totalTds`: number
- `totalRoundOff`: number
- `totalPayable`: number
- `outputFileName`: string

### `payment_blocks`

Stores owner-wise summaries for payment runs.

Fields:
- `_id`: ObjectId
- `paymentRunId`: ObjectId (ref `PaymentRun`)
- `ownerIdSnapshot`: ObjectId (ref `OwnerMaster`)
- `ownerNameSnapshot`: string
- `panNumberSnapshot`: string
- `tdsPercentageSnapshot`: number
- `commissionTypeSnapshot`: string
- `commissionValueSnapshot`: string
- `summaryValues`: object (totals for taxableValue, cgst, sgst, netBillAmount, diesel, cashAdvance, shortage, tds, roundOff, netPayable)

### `payment_rows`

Stores detailed merged/grouped load rows inside payment blocks.

Fields:
- `_id`: ObjectId
- `paymentBlockId`: ObjectId (ref `PaymentBlock`)
- `sourceImportRowIds`: array of ObjectIds
- `invoiceDate`: Date
- `truckNumber`: string
- `qty`: number
- `rate`: number
- `amount`: number
- `commission`: number
- `grossAmount`: number
- `diesel`: number
- `advance`: number
- `shortage`: number
- `netAmount`: number
