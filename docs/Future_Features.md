# Future Features

## Step 2 Candidates

- Trusted master-data seeder preview and apply workflow
- Saved import detail page
- Mismatch resolution workflow with `Update Master`, `Keep Existing`, `Skip`, and `Cancel Import`
- Owner CRUD screen
- Truck CRUD screen
- Duplicate detection dashboard
- Owner PAN correction workflow
- Settings page for GST, TDS, diesel rate, company GSTIN, and commission logic
- Seeder rerun comparison dashboard
- Source-row audit view for seeded masters

## Master Data Features

- Owner add/edit/delete
- Truck add/edit/delete
- Truck owner reassignment
- Owner TDS settings
- Owner commission settings
- Owner contact details
- Import corrections audit trail
- Master update audit trail

## Validation and Review Features

- Uploaded rows validated against `TruckMaster`
- Owner/PAN mismatch warnings against `OwnerMaster`
- Conflict resolution for truck-owner mismatch
- Missing PAN/GSTIN task list
- Duplicate invoice detection
- Amount mismatch review
- Manual adjustment notes
- Row exclusion before payment generation

## Payment Generation Features

- Select payment period
- Select owner or all owners
- Preview owner grouping before generating Excel
- Generate Excel workbook matching the reference payment sheet format
- Save generated payment runs
- Download generated workbook
- Regenerate with version history

## Reporting Features

- Owner-wise payment summary
- Period-wise payment summary
- Diesel deduction report
- TDS report
- GST report
- Pending correction report
- Master-data change report

## Security Features

- Real login
- Role-based access control
- Admin-only seed workflow
- User audit logs
- Protected file downloads
