# TODO - Payment Preview Accuracy Improvements

## Step 1: Backend: enforce Diesel rounding + 2-decimal summary payload
- [ ] Update `backend/server/src/services/paymentGeneration.service.js`
  - Diesel totals must be integer using `Math.round` (round first, then use for gross/net/summary/netPayable)
  - Summary numeric fields must be returned with exactly 2 decimals (as numbers, not strings)

## Step 2: Backend: fix owner completeness + ordering in preview
- [ ] Ensure preview includes **all eligible owners** for the selected filters
- [ ] Sort owner blocks by `ownerNameSnapshot` ascending

## Step 3: Frontend: align preview display strictly with backend payload
- [ ] Update `frontend/client/src/components/PaymentPreview.jsx`
  - Stop recalculating totals using local math drift
  - Diesel displayed as integer from backend payload
  - Summary fields display with exactly 2 decimals

## Step 4: Tests
- [ ] Update `backend/server/tests/paymentGeneration.test.js`
  - Add/extend tests:
    - Diesel rounding: decimals -> integer diesel used in all derived calc
    - Summary formatting: required fields with exactly 2 decimals
    - Multiple-owner preview: all owners visible and ordered by name asc
    - Ensure preview totals are consistent with saved snapshot (where feasible)

## Step 5: Run tests (backend)
- [ ] Run `cmd /c "cd backend\server && npm test"` and verify all tests pass

## Step 6: Verification against requirements
- [ ] Confirm preview vs export totals match numerically (via logic equality guarantee: export uses persisted PaymentRow values created from same backend calculation path)
