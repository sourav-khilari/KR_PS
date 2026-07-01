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
  await setting.save();
  return setting;
}

function toDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Calculate preview of payments
export async function getPaymentPreview({ startDate, endDate, ownerId, transportCompanyId, clientCompanyId, plantId }) {
  const settings = await getSettings();
  const activeRules = await CommissionRule.find({ status: 'active' });

  // Find all approved LoadRows in the range
  const filter = {
    'normalizedRow.invDate': {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    approvalStatus: 'approved'
  };

  if (transportCompanyId) filter.transportCompanyId = transportCompanyId;
  if (clientCompanyId) filter.clientCompanyId = clientCompanyId;
  if (plantId) filter.plantId = plantId;

  const rows = await LoadRow.find(filter);

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

        const comm = resolvedComm.amount;
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
            amount: resolvedComm.amount,
            source: resolvedComm.source,
            matchedRuleId: resolvedComm.matchedRuleId,
            fallbackUsed: resolvedComm.fallbackUsed
          },
          gstUsed: {
            rate: settings.gstRate
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
    const cgst = Number((taxableValue * (settings.cgstRate / 100)).toFixed(2));
    const sgst = Number((cgst).toFixed(2));
    const netBillAmount = Number((taxableValue + cgst + sgst).toFixed(2));

    // Use rounded diesel for all subsequent calculations
    const lessDiesel = roundedDiesel;
    const lessCashAdvance = Number((blockCashAdvance).toFixed(2));
    const lessShortage = Number((blockShortage).toFixed(2));
    const lessTds = Number(Math.round(taxableValue * (owner.tdsPercentage / 100)));

    const unroundedNetPayable = netBillAmount - lessDiesel - lessCashAdvance - lessShortage - lessTds;

    // Net payable is already rounded to whole rupees by existing business rule
    const netPayable = Math.round(unroundedNetPayable);
    const roundOff = netPayable - unroundedNetPayable;

    // For preview payload: enforce 2 decimals on summary numeric fields
    const summaryTaxableValue = Number((taxableValue).toFixed(2));
    const summaryNetBillAmount = Number((netBillAmount).toFixed(2));
    const summaryLessDiesel = Number((lessDiesel).toFixed(2));
    const summaryLessCashAdvance = Number((lessCashAdvance).toFixed(2));
    const summaryLessShortage = Number((lessShortage).toFixed(2));
    const summaryLessTds = Number((lessTds).toFixed(2));
    const summaryCgst = Number((cgst).toFixed(2));
    const summarySgst = Number((sgst).toFixed(2));
    const summaryRoundOff = Number((roundOff).toFixed(2));
    const summaryNetPayable = Number((netPayable).toFixed(2));

    blocks.push({
      ownerId: owner._id,
      ownerNameSnapshot: owner.ownerName,
      ownerPanSnapshot: owner.panNumber,
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
      summaryValues: {
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
    settings
  };
}

// Save Payment Run into MongoDB
export async function savePaymentRun(payload, currentUser) {
  const { periodStart, periodEnd, blocks, totals } = payload;

  const run = await PaymentRun.create({
    periodStart,
    periodEnd,
    selectedOwners: blocks.map((b) => b.ownerId),
    totals,
    exportContext: payload.exportContext || {},
    status: 'generated',
    generatedBy: currentUser?.id || currentUser?._id
  });

  for (const block of blocks) {
    const createdBlock = await PaymentBlock.create({
      paymentRunId: run._id,
      ownerId: block.ownerId,
      ownerNameSnapshot: block.ownerNameSnapshot,
      ownerPanSnapshot: block.ownerPanSnapshot,
      totals: {
        ...block.totals,
        totalShortage: block.totals.totalShortage ?? 0
      },
      summaryValues: block.summaryValues,
      status: 'approved'
    });

    const rowsToInsert = block.rows.map((r) => ({
      paymentBlockId: createdBlock._id,
      paymentRunId: run._id,
      sourceImportRowIds: r.sourceImportRowIds,
      truckNo: r.truckNo,
      invoiceDate: r.invoiceDate,
      partyName: r.partyName,
      destination: r.destination,
      cashAdvanceDate: r.cashAdvanceDate,
      repeatedTrip: r.repeatedTrip,
      rowValues: r.rowValues,
      commissionUsed: r.commissionUsed,
      gstUsed: r.gstUsed,
      tdsUsed: r.tdsUsed,
      netPayableUsed: r.netPayableUsed
    }));

    await PaymentRow.insertMany(rowsToInsert);

    // Update source LoadRows
    const rowIds = block.rows.flatMap((r) => r.sourceImportRowIds);
    await LoadRow.updateMany({ _id: { $in: rowIds } }, { approvalStatus: 'approved' });
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

