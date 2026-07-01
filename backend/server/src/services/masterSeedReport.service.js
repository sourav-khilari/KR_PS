import { normalizeSeederText } from '../helpers/masterSeederNormalization.js';

export function buildMasterSeedReport(input) {
  const summary = {
    seedRunId: input.seedRunId,
    status: input.status,
    sourceFiles: input.sourceFiles || [],
    sheetSummaries: input.sheetSummaries || [],
    totals: input.totals || {},
    createdOwners: input.createdOwners || [],
    updatedOwners: input.updatedOwners || [],
    createdTrucks: input.createdTrucks || [],
    updatedTrucks: input.updatedTrucks || [],
    skippedRows: input.skippedRows || [],
    conflicts: input.conflicts || [],
    generatedAt: input.generatedAt || new Date().toISOString()
  };

  return {
    ...summary,
    displayName: normalizeSeederText(input.reportFileName || `master-seed-${input.seedRunId}.json`)
  };
}