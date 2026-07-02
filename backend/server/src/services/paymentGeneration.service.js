import { buildPaymentWorkbook } from '../excel/paymentWorkbookBuilder.js';
import { Setting } from '../models/Setting.js';
import { OwnerMaster } from '../models/OwnerMaster.js';
import { TruckMaster } from '../models/TruckMaster.js';
import { LoadRow } from '../models/MasterImport.js';
import { PaymentRun } from '../models/PaymentRun.js';
import { PaymentBlock } from '../models/PaymentBlock.js';
import { PaymentRow } from '../models/PaymentRow.js';
import { CommissionRule } from '../models/CommissionRule.js';
import { normalizeTruckNumber, normalizeOwnerName } from '../helpers/normalize.js';
import { resolveCommissionForRow as resolveCommission } from './commissionResolver.service.js';


// Helper to get or initialize settings
export async function getSettings() {
  let setting = await Setting.findOne();
  if (!setting) {
    setting = await Setting.create({
      companyName: 'SHREE CEMENT LTD.',
      companyGstin: '',
      plantName: 'PURULIA',
      gstRate: 18,
      cgstRate: 9,
      sgstRate: 9,
      defaultRoundingRule: 'round'
    });
  }
  return setting;
}

export async function updateSettings(payload) {
  let setting = await Setting.findOne();
  if (!setting) {
    setting = new Setting();
  }
  Object.assign(setting, payload);
  if (payload && (payload.cgstRate !== undefined || payload.sgstRate !== undefined)) {
    const cgstRate = Number(setting.cgstRate || 0);
    const sgstRate = Number(setting.sgstRate || 0);
    setting.gstRate = cgstRate + sgstRate;
  }
  await setting.save();
  return setting;
}

function toDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toNumber(value) {
  return Number(Number(value ?? 0).toFixed(2));
}

function buildSummaryRows({
  gstApplicable,
  taxableValue,
  cgstRate,
  sgstRate,
  cgst,
  sgst,
  netBillAmount,
  lessDiesel,
  lessCashAdvance,
  lessShortage,
  lessTds,
  roundOff,
  netPayable
}) {
  if (gstApplicable) {
    return [
      { templateRow: 10, key: 'taxableValue', label: 'TAXABLE VALUE', value: taxableValue },
      { templateRow: 11, key: 'cgst', label: `ADD: CGST @${cgstRate}%`, value: cgst },
      { templateRow: 12, key: 'sgst', label: `ADD: SGST @${sgstRate}%`, value: sgst },
      { templateRow: 13, key: 'netBillAmount', label: 'NET BILL AMOUNT', value: netBillAmount },
      { templateRow: 14, key: 'lessDiesel', label: 'LESS: DIESEL', value: lessDiesel },
      { templateRow: 15, key: 'lessCashAdvance', label: 'LESS: CASH ADVANCE', value: lessCashAdvance },
      { templateRow: 16, key: 'lessShortage', label: 'LESS: SHORTAGE', value: lessShortage },
      { templateRow: 17, key: 'lessTds', label: 'LESS: TDS', value: lessTds },
      { templateRow: 18, key: 'roundOff', label: 'ROUND OFF', value: roundOff },
      { templateRow: 19, key: 'netPayable', label: 'NET PAYABLE', value: netPayable }
    ];
  }

  return [
    { templateRow: 10, key: 'taxableValue', label: 'TAXABLE VALUE', value: taxableValue },
    { templateRow: 14, key: 'lessDiesel', label: 'LESS: DIESEL', value: lessDiesel },
    { templateRow: 15, key: 'lessCashAdvance', label: 'LESS: CASH ADVANCE', value: lessCashAdvance },
    { templateRow: 16, key: 'lessShortage', label: 'LESS: SHORTAGE', value: lessShortage },
    { templateRow: 17, key: 'lessTds', label: 'LESS: TDS', value: lessTds },
    { templateRow: 18, key: 'roundOff', label: 'ROUND OFF', value: roundOff },
    { templateRow: 19, key: 'netPayable', label: 'NET PAYABLE', value: netPayable }
  ];
}

function buildPaymentPreviewQuery({ startDate, endDate, transportCompanyId, clientCompanyId, plantId }) {
  return {
    'normalizedRow.invDate': {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    approvalStatus: 'approved',
    transportCompanyId,
    clientCompanyId,
    plantId
  };
}

// Calculate preview of payments
export async function getPaymentPreview({ startDate, endDate, ownerId, transportCompanyId, clientCompanyId, plantId }) {
  if (!startDate || !endDate || !transportCompanyId || !clientCompanyId || !plantId) {
    const error = new Error('startDate, endDate, transportCompanyId, clientCompanyId, and plantId are required');
    error.statusCode = 400;
    throw error;
  }

  const settings = await getSettings();
  const activeRules = await CommissionRule.find({ status: 'active' });
  const filter = buildPaymentPreviewQuery({ startDate, endDate, transportCompanyId, clientCompanyId, plantId });

  console.log('[payment-preview] selected filters', {
    startDate,
    endDate,
    transportCompanyId,
    clientCompanyId,
    plantId,
    ownerId: ownerId || null
  });
  console.log('[payment-preview] mongo query', filter);

  const rows = await LoadRow.find(filter);
  console.log('[payment-preview] rows returned', rows.length);

  // Group load rows by owner
  const ownerGroups = {};
  const activeOwners = await OwnerMaster.find({ status: 'active' });

  // Map active owners by ID and normalized name for quick lookup
  const ownerMapById = {};
  const ownerMapByName = {};
  activeOwners.forEach((o) => {
    ownerMapById[o._id.toString()] = o;
    ownerMapByName[o.normalizedOwnerName] = o;
  });

  // Resolve owner for each load row
  for (const row of rows) {
    let resolvedOwner = null;

    // Lookup truck first
    const normTruck = normalizeTruckNumber(row.normalizedRow.truckNo);
    const truck = await TruckMaster.findOne({ normalizedTruckNumber: normTruck }).populate('ownerId');

    if (truck?.ownerId) {
      resolvedOwner = truck.ownerId;
    }

    // Fallback to name match (also covers cases where truck exists but ownerId is missing)
    if (!resolvedOwner) {
      const normName = normalizeOwnerName(row.normalizedRow.truckOwnerName);
      resolvedOwner = ownerMapByName[normName] || null;
    }

    // Skip only if BOTH truck-owner and name fallback fail
    if (!resolvedOwner) continue;

    const ownerStrId = resolvedOwner._id.toString();
    if (ownerId && ownerId !== ownerStrId) continue; // Filter by ownerId if provided

    if (!ownerGroups[ownerStrId]) {
      ownerGroups[ownerStrId] = {
        owner: resolvedOwner,
        rows: []
      };
    }
    ownerGroups[ownerStrId].rows.push(row);
  }

  const blocks = [];

  for (const [ownerStrId, group] of Object.entries(ownerGroups)) {
    const owner = group.owner;
    const gstApplicable = owner.gstApplicable !== false;
    const detailRows = group.rows;

    const truckDateGroups = {};
    detailRows.forEach((r) => {
      const truck = normalizeTruckNumber(r.normalizedRow.truckNo);
      const dateVal = toDateValue(r.normalizedRow.invDate);
      const dateStr = dateVal ? dateVal.toISOString().slice(0, 10) : String(r.normalizedRow.invDate || '').slice(0, 10);
      const key = `${truck}_${dateStr}`;

      if (!truckDateGroups[key]) {
        truckDateGroups[key] = [];
      }
      truckDateGroups[key].push(r);
    });

    function sortRepeatedTripRows(groupRows) {
      // Edge cases handled:
      // - sourceRowNumber missing/null: fall back to sourceRowNumber-less stable ordering via _id
      // - multiple rows with same sourceRowNumber: fall back to _id ordering
      // - ensures deterministic index=0 for repeated fixed commission zeroing
      return [...groupRows].sort((a, b) => {
        const aNum = Number(a?.sourceRowNumber ?? a?.sourceRowNumberNumber ?? null);
        const bNum = Number(b?.sourceRowNumber ?? b?.sourceRowNumberNumber ?? null);

        const aValid = Number.isFinite(aNum);
        const bValid = Number.isFinite(bNum);

        if (aValid && bValid && aNum !== bNum) return aNum - bNum;
        if (aValid && !bValid) return -1;
        if (!aValid && bValid) return 1;

        const aId = String(a?._id ?? '');
        const bId = String(b?._id ?? '');
        return aId.localeCompare(bId);
      });
    }

    const paymentRows = [];
    let blockQty = 0;
    let blockAmount = 0;
    let blockCommission = 0;
    let blockGross = 0;
    let blockDiesel = 0;
    let blockCashAdvance = 0;
    let blockRfidGps = 0;
    let blockShortage = 0;
    let blockUrea = 0;
    let blockNetAmount = 0;

    for (const groupRowsRaw of Object.values(truckDateGroups)) {
      const groupRows = sortRepeatedTripRows(groupRowsRaw);
      const repeatedTrip = groupRows.length > 1;

        groupRows.forEach((sourceRow, index) => {
        const qty = Number(sourceRow.normalizedRow.qty || 0);
        const rate = Number(sourceRow.normalizedRow.frtPmt || 0);
        const amount = Number(sourceRow.normalizedRow.frtAmt || 0);
        const bagShortage = Number(sourceRow.normalizedRow.bagShortage || 0);

        // Diesel rounding requirement:
        // Round diesel per-row first, then reuse that same rounded diesel for gross/net/summary calculations.
        const dieselRaw = Number(sourceRow.normalizedRow.dieselAmount || 0);
        const diesel = Math.round(dieselRaw);

        const cashAdvance = Number(sourceRow.normalizedRow.lessAdvance || 0);
        const rfid = Number(sourceRow.normalizedRow.rfid ?? sourceRow.normalizedRow.rfidTag ?? 0);
        const gps = Number(sourceRow.normalizedRow.gps ?? sourceRow.normalizedRow.gpsInstall ?? 0);
        const rfidGps = rfid + gps;
        const urea = Number(sourceRow.normalizedRow.urea || 0);
        const invoiceDate = toDateValue(sourceRow.normalizedRow.invDate);

        const resolvedComm = resolveCommission({
          owner,
          sourceRow,
          activeRules,
          repeatedTrip,
          repeatedTripIndex: index
        });

        // Round commission to whole rupees and use the rounded value for all downstream calculations
        const comm = Math.round(resolvedComm.amount);
        const gross = amount - comm;
        const netAmount = gross - bagShortage - diesel - cashAdvance - rfidGps;

        paymentRows.push({
          sourceImportRowIds: [sourceRow._id],
          truckNo: sourceRow.normalizedRow.truckNo,
          invoiceDate,
          partyName: sourceRow.normalizedRow.partyName || '',
          destination: sourceRow.normalizedRow.destination || '',
          cashAdvanceDate: toDateValue(sourceRow.normalizedRow.cashAdvanceDate || sourceRow.normalizedRow.invDate),
          repeatedTrip,
          rowValues: {
            qty,
            rate,
            amount,
            comm,
            gross,
            diesel,
            cashAdvance,
            rfid,
            gps,
            rfidGps,
            urea,
            bagShortage,
            netAmount
          },
          commissionUsed: {
            type: resolvedComm.type,
            value: resolvedComm.value,
            // store the rounded commission amount (used for display and calculations)
            amount: comm,
            source: resolvedComm.source,
            matchedRuleId: resolvedComm.matchedRuleId,
            fallbackUsed: resolvedComm.fallbackUsed
          },
          gstUsed: {
            applicable: gstApplicable,
            cgstRate: Number(settings.cgstRate || 0),
            sgstRate: Number(settings.sgstRate || 0),
            cgstAmount: 0,
            sgstAmount: 0,
            netBillAmount: 0
          },
          tdsUsed: {
            rate: owner.tdsPercentage,
            amount: Math.round(gross * (owner.tdsPercentage / 100))
          },
          netPayableUsed: netAmount
        });

        blockQty += qty;
        blockAmount += amount;
        blockCommission += comm;
        blockGross += gross;
        blockDiesel += diesel;
        blockCashAdvance += cashAdvance;
        blockRfidGps += rfidGps;
        blockShortage += bagShortage;
        blockUrea += urea;
        blockNetAmount += netAmount;
      });
    }

    // Diesel rounding requirement:
    // - Round diesel totals first (Math.round)
    // - Reuse the same rounded diesel in gross/net/summary/netPayable derivations
    const roundedDiesel = Math.round(blockDiesel);

    const taxableValue = blockGross;
    const cgstRate = Number(settings.cgstRate || 0);
    const sgstRate = Number(settings.sgstRate || 0);
    const cgst = gstApplicable ? toNumber(taxableValue * (cgstRate / 100)) : 0;
    const sgst = gstApplicable ? toNumber(taxableValue * (sgstRate / 100)) : 0;
    const netBillAmount = toNumber(taxableValue + cgst + sgst);

    // Use rounded diesel for all subsequent calculations
    const lessDiesel = roundedDiesel;
    const lessCashAdvance = Number((blockCashAdvance).toFixed(2));
    const lessShortage = Number((blockShortage).toFixed(2));
    const lessTds = Number(Math.round(taxableValue * (owner.tdsPercentage / 100)));

    const unroundedNetPayable = (gstApplicable ? netBillAmount : taxableValue) - lessDiesel - lessCashAdvance - lessShortage - lessTds;

    // Net payable is already rounded to whole rupees by existing business rule
    const netPayable = Math.round(unroundedNetPayable);
    const roundOff = netPayable - unroundedNetPayable;

    // For preview payload: enforce 2 decimals on summary numeric fields
    const summaryTaxableValue = toNumber(taxableValue);
    const summaryNetBillAmount = toNumber(netBillAmount);
    const summaryLessDiesel = toNumber(lessDiesel);
    const summaryLessCashAdvance = toNumber(lessCashAdvance);
    const summaryLessShortage = toNumber(lessShortage);
    const summaryLessTds = toNumber(lessTds);
    const summaryCgst = toNumber(cgst);
    const summarySgst = toNumber(sgst);
    const summaryRoundOff = toNumber(roundOff);
    const summaryNetPayable = toNumber(netPayable);

    const summaryRows = buildSummaryRows({
      gstApplicable,
      taxableValue: summaryTaxableValue,
      cgstRate,
      sgstRate,
      cgst: summaryCgst,
      sgst: summarySgst,
      netBillAmount: summaryNetBillAmount,
      lessDiesel: summaryLessDiesel,
      lessCashAdvance: summaryLessCashAdvance,
      lessShortage: summaryLessShortage,
      lessTds: summaryLessTds,
      roundOff: summaryRoundOff,
      netPayable: summaryNetPayable
    });

    paymentRows.forEach((paymentRow) => {
      paymentRow.gstUsed = {
        applicable: gstApplicable,
        cgstRate,
        sgstRate,
        cgstAmount: summaryCgst,
        sgstAmount: summarySgst,
        netBillAmount: summaryNetBillAmount
      };
    });

    blocks.push({
      ownerId: owner._id,
      ownerNameSnapshot: owner.ownerName,
      ownerPanSnapshot: owner.panNumber,
      gstApplicableSnapshot: gstApplicable,
      cgstRateSnapshot: cgstRate,
      sgstRateSnapshot: sgstRate,
      rows: paymentRows,
      totals: {
        totalQty: blockQty,
        totalAmount: blockAmount,
        totalCommission: blockCommission,
        totalGross: blockGross,
        totalDiesel: blockDiesel,
        totalCashAdvance: blockCashAdvance,
        totalRfidGps: blockRfidGps,
        totalShortage: blockShortage,
        totalTds: lessTds,
        totalGst: cgst + sgst,
        totalNetPayable: netPayable
      },
      summaryRows,
      summaryValues: {
        gstApplicable,
        cgstRate,
        sgstRate,
        cgstAmount: cgst,
        sgstAmount: sgst,
        taxableValue,
        cgst,
        sgst,
        netBillAmount,
        lessDiesel,
        lessCashAdvance,
        lessShortage,
        lessTds,
        roundOff,
        netPayable
      },
      warnings: !owner.panNumber ? ['PAN number is missing for owner'] : []
    });
  }

  console.log('[payment-preview] owners returned', Object.keys(ownerGroups).length);
  console.log('[payment-preview] payment blocks generated', blocks.length);

  if (rows.length === 0) {
    return {
      periodStart: new Date(startDate),
      periodEnd: new Date(endDate),
      totals: {
        totalQty: 0,
        totalAmount: 0,
        totalCommission: 0,
        totalGross: 0,
        totalDiesel: 0,
        totalCashAdvance: 0,
        totalRfidGps: 0,
        totalTds: 0,
        totalGst: 0,
        totalNetPayable: 0
      },
      blocks: [],
      settings,
      previewMeta: {
        selectedFilters: {
          startDate,
          endDate,
          transportCompanyId,
          clientCompanyId,
          plantId,
          ownerId: ownerId || null
        },
        matchedRows: 0,
        matchedOwners: 0,
        paymentBlocks: 0,
        message: 'No imported records found for the selected Transport Company, Client Company, Plant and Date Range.'
      }
    };
  }

  // overall run totals
  const overallTotals = blocks.reduce(
    (acc, b) => {
      acc.totalQty += b.totals.totalQty;
      acc.totalAmount += b.totals.totalAmount;
      acc.totalCommission += b.totals.totalCommission;
      acc.totalGross += b.totals.totalGross;
      acc.totalDiesel += b.totals.totalDiesel;
      acc.totalCashAdvance += b.totals.totalCashAdvance;
      acc.totalRfidGps += b.totals.totalRfidGps;
      acc.totalTds += b.totals.totalTds;
      acc.totalGst += b.totals.totalGst;
      acc.totalNetPayable += b.totals.totalNetPayable;
      return acc;
    },
    {
      totalQty: 0,
      totalAmount: 0,
      totalCommission: 0,
      totalGross: 0,
      totalDiesel: 0,
      totalCashAdvance: 0,
      totalRfidGps: 0,
      totalTds: 0,
      totalGst: 0,
      totalNetPayable: 0
    }
  );

  return {
    periodStart: new Date(startDate),
    periodEnd: new Date(endDate),
    totals: overallTotals,
    blocks,
    settings,
    previewMeta: {
      selectedFilters: {
        startDate,
        endDate,
        transportCompanyId,
        clientCompanyId,
        plantId,
        ownerId: ownerId || null
      },
      matchedRows: rows.length,
      matchedOwners: Object.keys(ownerGroups).length,
      paymentBlocks: blocks.length
    }
  };
}

// Save Payment Run into MongoDB
export async function savePaymentRun(payload, currentUser) {
  const { periodStart, periodEnd, blocks, totals } = payload;

  // Basic payload logging for diagnostics (keeps size small)
  try {
    console.log('[savePaymentRun] saving run for period', periodStart, '-', periodEnd, 'blocks:', (blocks || []).length);
  } catch (e) {
    // ignore logging errors
  }

  const run = await PaymentRun.create({
    periodStart,
    periodEnd,
    selectedOwners: blocks.map((b) => b.ownerId),
    totals,
    exportContext: payload.exportContext || {},
    status: 'generated',
    generatedBy: currentUser?.id || currentUser?._id
  });
  for (const [blockIndex, block] of (blocks || []).entries()) {
    try {
      const createdBlock = await PaymentBlock.create({
      paymentRunId: run._id,
      ownerId: block.ownerId,
      ownerNameSnapshot: block.ownerNameSnapshot,
      ownerPanSnapshot: block.ownerPanSnapshot,
      gstApplicableSnapshot: block.gstApplicableSnapshot ?? block.summaryValues?.gstApplicable ?? true,
      cgstRateSnapshot: block.cgstRateSnapshot ?? block.summaryValues?.cgstRate ?? 0,
      sgstRateSnapshot: block.sgstRateSnapshot ?? block.summaryValues?.sgstRate ?? 0,
      totals: {
        ...block.totals,
        totalShortage: block.totals.totalShortage ?? 0
      },
      summaryRows: block.summaryRows || [],
      summaryValues: block.summaryValues,
      status: 'approved'
    });
      // Sanitize and validate rows before insert
      const rowsToInsert = (block.rows || []).map((r, rowIndex) => {
        const invoiceDate = r.invoiceDate ? new Date(r.invoiceDate) : null;
        const cashAdvanceDate = r.cashAdvanceDate ? new Date(r.cashAdvanceDate) : null;

        if (!invoiceDate || Number.isNaN(invoiceDate.getTime())) {
          const details = {
            message: 'Invalid invoiceDate for row',
            blockIndex,
            blockOwner: block.ownerNameSnapshot,
            rowIndex,
            sourceImportRowIds: r.sourceImportRowIds
          };
          const err = new Error('Invalid invoiceDate in one of the rows. Save aborted.');
          err.statusCode = 400;
          err.details = details;
          throw err;
        }

        return {
          paymentBlockId: createdBlock._id,
          paymentRunId: run._id,
          sourceImportRowIds: (r.sourceImportRowIds || []).map((id) => String(id)),
          truckNo: String(r.truckNo || ''),
          invoiceDate,
          partyName: r.partyName || '',
          destination: r.destination || '',
          cashAdvanceDate: cashAdvanceDate && !Number.isNaN(cashAdvanceDate.getTime()) ? cashAdvanceDate : null,
          repeatedTrip: Boolean(r.repeatedTrip),
          rowValues: {
            qty: Number(r.rowValues?.qty || 0),
            rate: Number(r.rowValues?.rate || 0),
            amount: Number(r.rowValues?.amount || 0),
            comm: Number(r.rowValues?.comm || 0),
            gross: Number(r.rowValues?.gross || 0),
            diesel: Number(r.rowValues?.diesel || 0),
            cashAdvance: Number(r.rowValues?.cashAdvance || 0),
            rfid: Number(r.rowValues?.rfid || 0),
            gps: Number(r.rowValues?.gps || 0),
            rfidGps: Number(r.rowValues?.rfidGps || 0),
            urea: Number(r.rowValues?.urea || 0),
            bagShortage: Number(r.rowValues?.bagShortage || 0),
            netAmount: Number(r.rowValues?.netAmount || 0)
          },
          commissionUsed: {
            type: r.commissionUsed?.type || 'fixed',
            value: Number(r.commissionUsed?.value || 0),
            amount: Number(r.commissionUsed?.amount || 0),
            source: r.commissionUsed?.source || '',
            matchedRuleId: r.commissionUsed?.matchedRuleId || null,
            fallbackUsed: Boolean(r.commissionUsed?.fallbackUsed)
          },
          gstUsed: {
            applicable: r.gstUsed?.applicable !== false,
            cgstRate: Number(r.gstUsed?.cgstRate || 0),
            sgstRate: Number(r.gstUsed?.sgstRate || 0),
            cgstAmount: Number(r.gstUsed?.cgstAmount || 0),
            sgstAmount: Number(r.gstUsed?.sgstAmount || 0),
            netBillAmount: Number(r.gstUsed?.netBillAmount || 0)
          },
          tdsUsed: {
            rate: Number(r.tdsUsed?.rate || 0),
            amount: Number(r.tdsUsed?.amount || 0)
          },
          netPayableUsed: Number(r.netPayableUsed || 0)
        };
      });

      await PaymentRow.insertMany(rowsToInsert);

      // Update source LoadRows
      const rowIds = (block.rows || []).flatMap((r) => r.sourceImportRowIds || []);
      await LoadRow.updateMany({ _id: { $in: rowIds } }, { approvalStatus: 'approved' });
    } catch (err) {
      // add context and rethrow so controller middleware returns useful details
      console.error('[savePaymentRun] error processing block', blockIndex, 'owner:', block?.ownerNameSnapshot, err && (err.stack || err));
      throw err;
    }
  }

  // Update run with standard file name
  run.outputFileName = `SHREE_PURULIA_PAYMENT_${run._id}.xlsx`;
  await run.save();

  return run;
}

// Export the immutable Payment Run snapshot through the styled workbook template.
export async function exportPaymentRunExcel(runId) {
  const run = await PaymentRun.findById(runId);
  if (!run) throw new Error('Payment run not found');

  const blocks = await PaymentBlock.find({ paymentRunId: runId });
  const snapshotBlocks = await Promise.all(blocks.map(async (block) => {
    const rows = await PaymentRow.find({ paymentBlockId: block._id }).sort({ invoiceDate: 1, _id: 1 });
    return {
      ...(typeof block.toObject === 'function' ? block.toObject() : block),
      rows
    };
  }));

  const { excelBuffer } = await buildPaymentWorkbook({ run, blocks: snapshotBlocks });
  return { excelBuffer, outputFileName: run.outputFileName };
}

export async function getMasterPrepSummary() {
  const allOwners = await OwnerMaster.find();
  const allTrucks = await TruckMaster.find().populate('ownerId');

  const totalOwners = allOwners.length;
  const activeOwnersList = allOwners.filter(o => o.status === 'active');
  const activeOwners = activeOwnersList.length;
  const inactiveOwners = totalOwners - activeOwners;

  const totalTrucks = allTrucks.length;
  const activeTrucksList = allTrucks.filter(t => t.status === 'active');
  const activeTrucks = activeTrucksList.length;
  const inactiveTrucks = totalTrucks - activeTrucks;

  // owners missing PAN
  const missingPan = activeOwnersList.filter(o => !o.panNumber || o.panNumber.trim() === '');
  
  // owners missing TDS
  const missingTds = activeOwnersList.filter(o => o.tdsPercentage === null || o.tdsPercentage === undefined || o.tdsPercentage === 0);
  
  // owners missing commission
  const missingCommission = activeOwnersList.filter(o => {
    if (o.commissionType === 'fixed' || o.commissionType === 'percentage') {
      return o.commissionValue === null || o.commissionValue === undefined || o.commissionValue === 0;
    } else if (o.commissionType === 'truck_wise') {
      const mapSize = (o.truckWiseCommissionMap && typeof o.truckWiseCommissionMap.size === 'number') 
        ? o.truckWiseCommissionMap.size 
        : (o.truckWiseCommissionMap ? Object.keys(o.truckWiseCommissionMap).length : 0);
      return mapSize === 0;
    }
    return true;
  });

  // trucks without owner (active trucks)
  const trucksWithoutOwner = activeTrucksList.filter(t => !t.ownerId || (t.ownerId && t.ownerId.status !== 'active'));

  // recently updated trucks (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentlyUpdatedTrucks = activeTrucksList.filter(t => t.updatedAt >= sevenDaysAgo);

  // owners with multiple active trucks
  const ownerTruckCounts = {};
  activeTrucksList.forEach(t => {
    if (t.ownerId && t.ownerId.status === 'active') {
      const oid = t.ownerId._id.toString();
      ownerTruckCounts[oid] = (ownerTruckCounts[oid] || 0) + 1;
    }
  });
  
  const ownersWithMultipleTrucksList = activeOwnersList.filter(o => ownerTruckCounts[o._id.toString()] > 1);

  return {
    stats: {
      totalOwners,
      activeOwners,
      inactiveOwners,
      totalTrucks,
      activeTrucks,
      ownersMissingPan: missingPan.length,
      ownersMissingTds: missingTds.length,
      ownersMissingCommission: missingCommission.length,
      trucksWithoutOwner: trucksWithoutOwner.length,
      recentlyUpdatedTrucksCount: recentlyUpdatedTrucks.length,
      ownersWithMultipleTrucksCount: ownersWithMultipleTrucksList.length
    },
    warnings: {
      missingPan: missingPan.map(o => ({ _id: o._id, ownerName: o.ownerName, status: o.status })),
      missingTds: missingTds.map(o => ({ _id: o._id, ownerName: o.ownerName, tdsPercentage: o.tdsPercentage, status: o.status })),
      missingCommission: missingCommission.map(o => ({ _id: o._id, ownerName: o.ownerName, commissionType: o.commissionType, commissionValue: o.commissionValue, status: o.status })),
      trucksWithoutOwner: trucksWithoutOwner.map(t => ({ _id: t._id, truckNumber: t.truckNumber, status: t.status }))
    },
    recentlyUpdatedTrucks: recentlyUpdatedTrucks.map(t => ({
      _id: t._id,
      truckNumber: t.truckNumber,
      updatedAt: t.updatedAt,
      owner: t.ownerId ? { _id: t.ownerId._id, ownerName: t.ownerId.ownerName } : null
    })),
    ownersWithMultipleTrucks: ownersWithMultipleTrucksList.map(o => ({
      _id: o._id,
      ownerName: o.ownerName,
      truckCount: ownerTruckCounts[o._id.toString()]
    }))
  };
}

