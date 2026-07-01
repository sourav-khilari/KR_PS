import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MASTER_STATUS } from '../constants/masterData.js';
import { MasterSeedRun } from '../models/MasterSeedRun.js';
import { OwnerMaster } from '../models/OwnerMaster.js';
import { TruckMaster } from '../models/TruckMaster.js';
import { groupPreferredByKey, areEquivalentOwnerRecords, areEquivalentTruckRecords, pickBetterDisplayName } from '../helpers/masterSeedDuplicates.js';
import {
  isValidSeederPan,
  normalizeSeederOwnerKey,
  normalizeSeederOwnerName,
  normalizeSeederPan,
  normalizeSeederText,
  normalizeSeederTruckNumber
} from '../helpers/masterSeederNormalization.js';
import { parseTrustedSeederWorkbook } from '../excel/masterSeederWorkbook.js';
import { buildMasterSeedReport } from './masterSeedReport.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../');
const defaultTrustedFiles = [
  path.join(repoRoot, 'analysis_input', 'PURULIA TRUCK LOAD DETAILS (2026-27).xlsx'),
  path.join(repoRoot, 'analysis_input', 'SHREE PURULIA PAYMENT (2026-27).xlsx')
];

function buildSeedRunId() {
  return `seed-${new Date().toISOString().replace(/[:.]/g, '-')}`;
}

function toAbsoluteFilePath(filePath) {
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(process.cwd(), filePath);
}

function sourceFileRecord(filePath) {
  return {
    fileName: path.basename(filePath),
    filePath
  };
}

function isRowUseful(row) {
  return Boolean(normalizeSeederTruckNumber(row.truckNumber) || normalizeSeederOwnerKey(row.ownerName) || normalizeSeederPan(row.ownerPan));
}

function attachNormalizedFields(row) {
  const ownerName = normalizeSeederOwnerName(row.ownerName);
  const normalizedOwnerName = normalizeSeederOwnerKey(ownerName);
  const ownerPan = normalizeSeederPan(row.ownerPan);
  const truckNumber = normalizeSeederTruckNumber(row.truckNumber);

  return {
    ...row,
    ownerName,
    normalizedOwnerName,
    ownerPan,
    normalizedOwnerPan: ownerPan,
    truckNumber,
    normalizedTruckNumber: truckNumber
  };
}

function buildSkippedRow(row, reason) {
  return {
    sourceFileName: row.sourceFileName,
    sourceSheetName: row.sourceSheetName,
    sourceRowNumber: row.sourceRowNumber,
    truckNumber: normalizeSeederTruckNumber(row.truckNumber),
    ownerName: normalizeSeederOwnerName(row.ownerName),
    ownerPan: normalizeSeederPan(row.ownerPan),
    reason
  };
}

function rowToOwnerCandidate(row) {
  return {
    ...row,
    ownerName: normalizeSeederOwnerName(row.ownerName),
    normalizedOwnerName: normalizeSeederOwnerKey(row.ownerName),
    ownerPan: normalizeSeederPan(row.ownerPan),
    normalizedOwnerPan: normalizeSeederPan(row.ownerPan)
  };
}

function ownerKey(candidate) {
  return candidate.normalizedOwnerPan || candidate.normalizedOwnerName;
}

function truckKey(candidate) {
  return candidate.normalizedTruckNumber;
}

function resolveOwnerReference(row, ownerNameIndex, ownerPanIndex) {
  const normalizedOwnerName = normalizeSeederOwnerKey(row.ownerName);
  const normalizedOwnerPan = normalizeSeederPan(row.ownerPan);

  if (normalizedOwnerPan && ownerPanIndex.has(normalizedOwnerPan)) {
    return ownerPanIndex.get(normalizedOwnerPan);
  }

  if (normalizedOwnerName && ownerNameIndex.has(normalizedOwnerName)) {
    return ownerNameIndex.get(normalizedOwnerName);
  }

  return null;
}

async function upsertOwnerMaster(candidate, seedRunId, createdBy) {
  let existing = null;
  if (candidate.normalizedOwnerPan) {
    existing = await OwnerMaster.findOne({ panNumber: candidate.normalizedOwnerPan });
  } else {
    existing = await OwnerMaster.findOne({ normalizedOwnerName: candidate.normalizedOwnerName });
  }

  const seedMetadata = {
    sourceSeedRunId: seedRunId,
    sourceFileName: candidate.sourceFileName,
    sourceSheetName: candidate.sourceSheetName,
    sourceRowNumber: candidate.sourceRowNumber,
    sourceStatus: existing ? 'updated' : 'created',
    seededBy: createdBy,
    seededAt: new Date()
  };

  if (!existing) {
    const owner = await OwnerMaster.create({
      ownerName: candidate.ownerName,
      normalizedOwnerName: candidate.normalizedOwnerName,
      panNumber: candidate.normalizedOwnerPan || '',
      status: MASTER_STATUS.ACTIVE,
      sourceSeedRunId: seedRunId,
      sourceFileName: candidate.sourceFileName,
      sourceSheetName: candidate.sourceSheetName,
      sourceRowNumber: candidate.sourceRowNumber,
      sourceStatus: 'created',
      seededBy: createdBy,
      seededAt: new Date(),
      createdBy: null,
      updatedBy: null
    });

    return { action: 'created', owner, seedMetadata };
  }

  const updatedOwnerName = pickBetterDisplayName(existing.ownerName, candidate.ownerName);
  const ownerNameChanged = normalizeSeederOwnerKey(updatedOwnerName) === candidate.normalizedOwnerName && updatedOwnerName !== existing.ownerName;

  if (ownerNameChanged) {
    existing.ownerName = updatedOwnerName;
    existing.normalizedOwnerName = normalizeSeederOwnerKey(updatedOwnerName);
  }

  let panChanged = false;
  if (candidate.normalizedOwnerPan && existing.panNumber !== candidate.normalizedOwnerPan) {
    existing.panNumber = candidate.normalizedOwnerPan;
    panChanged = true;
  }

  existing.sourceSeedRunId = seedRunId;
  existing.sourceFileName = candidate.sourceFileName;
  existing.sourceSheetName = candidate.sourceSheetName;
  existing.sourceRowNumber = candidate.sourceRowNumber;
  existing.sourceStatus = 'updated';
  existing.seededBy = createdBy;
  existing.seededAt = new Date();
  await existing.save();

  const changed = ownerNameChanged || panChanged;
  return { action: changed ? 'updated' : 'unchanged', owner: existing, seedMetadata };
}

async function upsertTruckMaster(candidate, ownerId, seedRunId, createdBy) {
  const existing = await TruckMaster.findOne({ normalizedTruckNumber: candidate.normalizedTruckNumber });
  const seedMetadata = {
    sourceSeedRunId: seedRunId,
    sourceFileName: candidate.sourceFileName,
    sourceSheetName: candidate.sourceSheetName,
    sourceRowNumber: candidate.sourceRowNumber,
    sourceStatus: existing ? 'updated' : 'created',
    seededBy: createdBy,
    seededAt: new Date()
  };

  if (!existing) {
    const truck = await TruckMaster.create({
      truckNumber: candidate.truckNumber,
      normalizedTruckNumber: candidate.normalizedTruckNumber,
      ownerId,
      status: MASTER_STATUS.ACTIVE,
      sourceSeedRunId: seedRunId,
      sourceFileName: candidate.sourceFileName,
      sourceSheetName: candidate.sourceSheetName,
      sourceRowNumber: candidate.sourceRowNumber,
      sourceStatus: 'created',
      seededBy: createdBy,
      seededAt: new Date(),
      createdBy: null,
      updatedBy: null
    });

    return { action: 'created', truck, seedMetadata };
  }

  if (String(existing.ownerId) !== String(ownerId)) {
    const error = new Error('Truck already mapped to a different owner');
    error.statusCode = 409;
    error.conflict = {
      type: 'truck_owner_conflict',
      sourceFileName: candidate.sourceFileName,
      sourceSheetName: candidate.sourceSheetName,
      sourceRowNumber: candidate.sourceRowNumber,
      truckNumber: candidate.truckNumber,
      existingOwnerId: String(existing.ownerId),
      incomingOwnerId: String(ownerId)
    };
    throw error;
  }

  const truckChanged = normalizeSeederText(existing.truckNumber) !== candidate.truckNumber;
  if (truckChanged) {
    existing.truckNumber = candidate.truckNumber;
  }

  if (existing.status !== MASTER_STATUS.ACTIVE) {
    existing.status = MASTER_STATUS.ACTIVE;
  }

  existing.sourceSeedRunId = seedRunId;
  existing.sourceFileName = candidate.sourceFileName;
  existing.sourceSheetName = candidate.sourceSheetName;
  existing.sourceRowNumber = candidate.sourceRowNumber;
  existing.sourceStatus = 'updated';
  existing.seededBy = createdBy;
  existing.seededAt = new Date();
  await existing.save();

  return { action: truckChanged ? 'updated' : 'unchanged', truck: existing, seedMetadata };
}

export async function seedTrustedMasterData(options = {}) {
  const seedRunId = options.seedRunId || buildSeedRunId();
  const createdBy = options.createdBy || 'master-seeder';
  const sourceFiles = (options.sourceFiles && options.sourceFiles.length ? options.sourceFiles : defaultTrustedFiles).map(toAbsoluteFilePath);
  const parsedFiles = [];
  const parsedRows = [];
  const sheetSummaries = [];
  const loadRows = [];
  const paymentRows = [];

  for (const filePath of sourceFiles) {
    const buffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    const parsed = parseTrustedSeederWorkbook(buffer, fileName);
    parsedFiles.push(sourceFileRecord(filePath));
    sheetSummaries.push(...parsed.sheetSummaries);
    const normalizedRows = parsed.rows.map(attachNormalizedFields);
    parsedRows.push(...normalizedRows);

    normalizedRows.forEach((row) => {
      if (row.sourceType === 'load') loadRows.push(row);
      if (row.sourceType === 'payment') paymentRows.push(row);
    });
  }

  const skippedRows = [];
  const ownerCandidatesRaw = [];

  loadRows.forEach((row) => {
    if (!row.ownerName) {
      skippedRows.push(buildSkippedRow(row, 'Owner name is missing'));
      return;
    }

    ownerCandidatesRaw.push(rowToOwnerCandidate(row));
  });

  paymentRows.forEach((row) => {
    if (!row.ownerName) {
      return;
    }

    ownerCandidatesRaw.push(rowToOwnerCandidate(row));
  });

  const dedupedOwners = groupPreferredByKey(ownerCandidatesRaw, ownerKey, areEquivalentOwnerRecords);
  const ownerNameIndex = new Map();
  const ownerPanIndex = new Map();
  const createdOwners = [];
  const updatedOwners = [];
  const ownerConflicts = [...dedupedOwners.conflicts];

  for (const ownerCandidate of dedupedOwners.records) {
    const validPan = isValidSeederPan(ownerCandidate.ownerPan);
    const cleanedPan = validPan ? ownerCandidate.ownerPan : '';

    const adjustedCandidate = {
      ...ownerCandidate,
      ownerPan: cleanedPan,
      normalizedOwnerPan: cleanedPan
    };

    const result = await upsertOwnerMaster(adjustedCandidate, seedRunId, createdBy);
    if (result.action === 'created') createdOwners.push(result.owner);
    if (result.action === 'updated') updatedOwners.push(result.owner);

    ownerNameIndex.set(adjustedCandidate.normalizedOwnerName, result.owner);
    if (cleanedPan) {
      ownerPanIndex.set(cleanedPan, result.owner);
    }
  }

  const truckCandidatesRaw = [];
  for (const row of loadRows) {
    if (!row.truckNumber) {
      skippedRows.push(buildSkippedRow(row, 'Truck number is missing'));
      continue;
    }

    let resolvedOwner = resolveOwnerReference(row, ownerNameIndex, ownerPanIndex);
    
    // If owner couldn't be resolved but row has owner name, create it inline
    if (!resolvedOwner && row.ownerName) {
      const inlineOwnerCandidate = rowToOwnerCandidate(row);
      const validPan = isValidSeederPan(inlineOwnerCandidate.ownerPan);
      const cleanedPan = validPan ? inlineOwnerCandidate.ownerPan : '';
      
      const adjustedInlineCandidate = {
        ...inlineOwnerCandidate,
        ownerPan: cleanedPan,
        normalizedOwnerPan: cleanedPan
      };
      
      const inlineResult = await upsertOwnerMaster(adjustedInlineCandidate, seedRunId, createdBy);
      resolvedOwner = inlineResult.owner;
      
      // Update indexes for future lookups
      ownerNameIndex.set(adjustedInlineCandidate.normalizedOwnerName, resolvedOwner);
      if (cleanedPan) {
        ownerPanIndex.set(cleanedPan, resolvedOwner);
      }
      
      // Track the creation
      if (inlineResult.action === 'created') createdOwners.push(inlineResult.owner);
      if (inlineResult.action === 'updated') updatedOwners.push(inlineResult.owner);
    }
    
    if (!resolvedOwner) {
      skippedRows.push(buildSkippedRow(row, 'Owner name is missing and owner could not be resolved from trusted sources'));
      continue;
    }

    truckCandidatesRaw.push({
      ...row,
      ownerName: resolvedOwner.ownerName,
      ownerPan: resolvedOwner.panNumber,
      resolvedOwnerId: resolvedOwner._id
    });
  }

  const dedupedTrucks = groupPreferredByKey(truckCandidatesRaw, truckKey, areEquivalentTruckRecords);
  const createdTrucks = [];
  const updatedTrucks = [];
  const truckConflicts = [...dedupedTrucks.conflicts];

  for (const truckCandidate of dedupedTrucks.records) {
    try {
      const result = await upsertTruckMaster(truckCandidate, truckCandidate.resolvedOwnerId, seedRunId, createdBy);
      if (result.action === 'created') createdTrucks.push(result.truck);
      if (result.action === 'updated') updatedTrucks.push(result.truck);
    } catch (error) {
      if (error.statusCode === 409) {
        truckConflicts.push(error.conflict || { type: 'truck_owner_conflict', reason: error.message, truckCandidate });
        skippedRows.push(buildSkippedRow(truckCandidate, error.message));
        continue;
      }
      throw error;
    }
  }

  const totalConflicts = [...ownerConflicts, ...truckConflicts];
  const summary = {
    rowsSeen: parsedRows.length,
    uniqueOwners: dedupedOwners.records.length,
    uniqueTrucks: dedupedTrucks.records.length,
    createdOwners: createdOwners.length,
    updatedOwners: updatedOwners.length,
    createdTrucks: createdTrucks.length,
    updatedTrucks: updatedTrucks.length,
    skippedRows: skippedRows.length,
    conflicts: totalConflicts.length
  };

  const status = totalConflicts.length > 0 ? 'completed_with_conflicts' : 'completed';
  const report = buildMasterSeedReport({
    seedRunId,
    status,
    sourceFiles: parsedFiles,
    sheetSummaries,
    totals: summary,
    createdOwners: createdOwners.map((owner) => ({ id: owner._id, ownerName: owner.ownerName, panNumber: owner.panNumber })),
    updatedOwners: updatedOwners.map((owner) => ({ id: owner._id, ownerName: owner.ownerName, panNumber: owner.panNumber })),
    createdTrucks: createdTrucks.map((truck) => ({ id: truck._id, truckNumber: truck.truckNumber, ownerId: truck.ownerId })),
    updatedTrucks: updatedTrucks.map((truck) => ({ id: truck._id, truckNumber: truck.truckNumber, ownerId: truck.ownerId })),
    skippedRows,
    conflicts: totalConflicts,
    reportFileName: `master-seed-${seedRunId}.json`
  });

  const reportFileName = `master-seed-${seedRunId}.json`;
  const reportFilePath = path.join(repoRoot, 'backend', 'server', 'logs', reportFileName);
  await fs.mkdir(path.dirname(reportFilePath), { recursive: true });
  await fs.writeFile(reportFilePath, JSON.stringify(report, null, 2), 'utf8');

  const seedRun = await MasterSeedRun.create({
    seedRunId,
    sourceFiles: parsedFiles,
    status,
    summary,
    sheetSummaries,
    skippedRows,
    conflicts: totalConflicts,
    reportFileName,
    reportFilePath,
    createdBy
  });

  return {
    seedRun,
    report,
    reportFilePath,
    summary,
    createdOwners,
    updatedOwners,
    createdTrucks,
    updatedTrucks,
    skippedRows,
    conflicts: totalConflicts
  };
}