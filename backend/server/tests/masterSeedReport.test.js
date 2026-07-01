import { describe, expect, it } from 'vitest';
import { buildMasterSeedReport } from '../src/services/masterSeedReport.service.js';

describe('buildMasterSeedReport', () => {
  it('creates a structured summary payload', () => {
    const report = buildMasterSeedReport({
      seedRunId: 'seed-123',
      status: 'completed',
      sourceFiles: [{ fileName: 'a.xlsx' }],
      sheetSummaries: [{ sheetName: 'Sheet1' }],
      totals: { createdOwners: 1 },
      createdOwners: [{ id: '1' }],
      skippedRows: [{ sourceRowNumber: 3 }]
    });

    expect(report).toMatchObject({
      seedRunId: 'seed-123',
      status: 'completed',
      totals: { createdOwners: 1 },
      createdOwners: [{ id: '1' }],
      skippedRows: [{ sourceRowNumber: 3 }]
    });
  });
});
