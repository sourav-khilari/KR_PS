import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const TEMPLATE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../templates/payment-template.xlsx'
);
const DETAIL_ROW = 6;
const TOTAL_ROW = 7;
const SUMMARY_START_ROW = 10;
const TEMPLATE_END_ROW = 19;
const COLUMN_COUNT = 16;
const BLOCK_SPACING_ROWS = 3;
const NUMBER_FORMAT = '#,##0.00';
const DATE_FORMAT = 'dd/mm/yyyy';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function parseCellAddress(address) {
  const match = /^([A-Z]+)(\d+)$/.exec(address);
  if (!match) throw new Error(`Invalid template cell address: ${address}`);
  let column = 0;
  for (const char of match[1]) column = column * 26 + char.charCodeAt(0) - 64;
  return { row: Number(match[2]), column };
}

function mapTemplateRow(sourceRow, targetStartRow, extraDetailRows) {
  const shiftedRow = sourceRow >= TOTAL_ROW ? sourceRow + extraDetailRows : sourceRow;
  return targetStartRow + shiftedRow - 1;
}

function copyCell(sourceCell, targetCell) {
  targetCell.value = clone(sourceCell.value);
  targetCell.style = clone(sourceCell.style) || {};
  if (sourceCell.note) targetCell.note = clone(sourceCell.note);
  if (sourceCell.dataValidation) targetCell.dataValidation = clone(sourceCell.dataValidation);
}

function copyRow(sourceSheet, targetSheet, sourceRowNumber, targetRowNumber) {
  const sourceRow = sourceSheet.getRow(sourceRowNumber);
  const targetRow = targetSheet.getRow(targetRowNumber);
  targetRow.height = sourceRow.height;
  targetRow.hidden = sourceRow.hidden;
  targetRow.outlineLevel = sourceRow.outlineLevel;
  for (let column = 1; column <= COLUMN_COUNT; column += 1) {
    copyCell(sourceRow.getCell(column), targetRow.getCell(column));
  }
}

function copyRowMerges(sourceSheet, targetSheet, sourceRowNumber, targetRowNumber) {
  for (const merge of sourceSheet.model.merges || []) {
    const [startAddress, endAddress] = merge.split(':');
    const start = parseCellAddress(startAddress);
    const end = parseCellAddress(endAddress || startAddress);
    if (start.row === sourceRowNumber && end.row === sourceRowNumber) {
      targetSheet.mergeCells(targetRowNumber, start.column, targetRowNumber, end.column);
    }
  }
}

function copySheetSettings(sourceSheet, targetSheet) {
  targetSheet.properties = clone(sourceSheet.properties) || {};
  targetSheet.pageSetup = clone(sourceSheet.pageSetup) || {};
  targetSheet.headerFooter = clone(sourceSheet.headerFooter) || {};
  targetSheet.views = clone(sourceSheet.views) || [];
  targetSheet.autoFilter = clone(sourceSheet.autoFilter);
  for (let column = 1; column <= COLUMN_COUNT; column += 1) {
    const sourceColumn = sourceSheet.getColumn(column);
    const targetColumn = targetSheet.getColumn(column);
    targetColumn.width = sourceColumn.width;
    targetColumn.hidden = sourceColumn.hidden;
    targetColumn.outlineLevel = sourceColumn.outlineLevel;
    targetColumn.style = clone(sourceColumn.style) || {};
  }
}

function copyTemplateMerges(sourceSheet, targetSheet, targetStartRow, extraDetailRows) {
  for (const merge of sourceSheet.model.merges || []) {
    const [startAddress, endAddress] = merge.split(':');
    const start = parseCellAddress(startAddress);
    const end = parseCellAddress(endAddress || startAddress);
    if (start.row >= SUMMARY_START_ROW || end.row >= SUMMARY_START_ROW) continue;
    const mappedStart = mapTemplateRow(start.row, targetStartRow, extraDetailRows);
    const mappedEnd = mapTemplateRow(end.row, targetStartRow, extraDetailRows);
    targetSheet.mergeCells(mappedStart, start.column, mappedEnd, end.column);
  }
}

function replacePlaceholders(sheet, startRow, endRow, values) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = 1; column <= COLUMN_COUNT; column += 1) {
      const cell = sheet.getCell(row, column);
      if (typeof cell.value !== 'string') continue;
      cell.value = cell.value.replace(/{{[A-Z_]+}}/g, (placeholder) => (
        Object.hasOwn(values, placeholder) ? String(values[placeholder] ?? '') : placeholder
      ));
    }
  }
}

function setNumber(cell, value) {
  cell.value = Number(value ?? 0);
  cell.numFmt = NUMBER_FORMAT;
}

function setDate(cell, value) {
  cell.value = value ? new Date(value) : null;
  cell.numFmt = DATE_FORMAT;
}

function renderTripRow(sheet, rowNumber, trip, index) {
  const values = trip.rowValues || {};
  sheet.getCell(rowNumber, 1).value = index + 1;
  setDate(sheet.getCell(rowNumber, 2), trip.invoiceDate);
  sheet.getCell(rowNumber, 3).value = trip.truckNo || '';
  sheet.getCell(rowNumber, 4).value = trip.partyName || '';
  sheet.getCell(rowNumber, 5).value = trip.destination || '';
  setNumber(sheet.getCell(rowNumber, 6), values.qty);
  setNumber(sheet.getCell(rowNumber, 7), values.rate);
  setNumber(sheet.getCell(rowNumber, 8), values.amount);
  setNumber(sheet.getCell(rowNumber, 9), values.comm);
  setNumber(sheet.getCell(rowNumber, 10), values.gross);
  setNumber(sheet.getCell(rowNumber, 11), values.bagShortage);
  setNumber(sheet.getCell(rowNumber, 12), values.diesel);
  setDate(sheet.getCell(rowNumber, 13), trip.cashAdvanceDate);
  setNumber(sheet.getCell(rowNumber, 14), values.cashAdvance);
  setNumber(sheet.getCell(rowNumber, 15), values.rfidGps);
  setNumber(sheet.getCell(rowNumber, 16), values.netAmount);
}

function renderTotals(sheet, rowNumber, block) {
  const totals = block.totals || {};
  const rows = block.rows || [];
  setNumber(sheet.getCell(rowNumber, 6), totals.totalQty);
  setNumber(sheet.getCell(rowNumber, 8), totals.totalAmount);
  setNumber(sheet.getCell(rowNumber, 9), totals.totalCommission);
  setNumber(sheet.getCell(rowNumber, 10), totals.totalGross);
  setNumber(sheet.getCell(rowNumber, 11), totals.totalShortage);
  setNumber(sheet.getCell(rowNumber, 12), totals.totalDiesel);
  setNumber(sheet.getCell(rowNumber, 14), totals.totalCashAdvance);
  setNumber(sheet.getCell(rowNumber, 15), totals.totalRfidGps);
  setNumber(sheet.getCell(rowNumber, 16), rows.reduce((sum, row) => sum + Number(row.rowValues?.netAmount || 0), 0));
}

function renderSummaryRows(templateSheet, targetSheet, startRow, summaryRows) {
  summaryRows.forEach((rowSpec, index) => {
    const targetRowNumber = startRow + index;
    copyRow(templateSheet, targetSheet, rowSpec.templateRow, targetRowNumber);
    copyRowMerges(templateSheet, targetSheet, rowSpec.templateRow, targetRowNumber);
    setNumber(targetSheet.getCell(targetRowNumber, 4), rowSpec.value);
  });
}

function legacySummaryRows(block) {
  const summary = block.summaryValues || {};
  if (summary.gstApplicable === false) {
    return [
      { templateRow: 10, key: 'taxableValue', label: 'TAXABLE VALUE', value: summary.taxableValue || 0 },
      { templateRow: 14, key: 'lessDiesel', label: 'LESS: DIESEL', value: summary.lessDiesel || 0 },
      { templateRow: 15, key: 'lessCashAdvance', label: 'LESS: CASH ADVANCE', value: summary.lessCashAdvance || 0 },
      { templateRow: 16, key: 'lessShortage', label: 'LESS: SHORTAGE', value: summary.lessShortage || 0 },
      { templateRow: 17, key: 'lessTds', label: 'LESS: TDS', value: summary.lessTds || 0 },
      { templateRow: 18, key: 'roundOff', label: 'ROUND OFF', value: summary.roundOff || 0 },
      { templateRow: 19, key: 'netPayable', label: 'NET PAYABLE', value: summary.netPayable || 0 }
    ];
  }

  return [
    { templateRow: 10, key: 'taxableValue', label: 'TAXABLE VALUE', value: summary.taxableValue || 0 },
    { templateRow: 11, key: 'cgst', label: 'ADD: CGST', value: summary.cgst || 0 },
    { templateRow: 12, key: 'sgst', label: 'ADD: SGST', value: summary.sgst || 0 },
    { templateRow: 13, key: 'netBillAmount', label: 'NET BILL AMOUNT', value: summary.netBillAmount || 0 },
    { templateRow: 14, key: 'lessDiesel', label: 'LESS: DIESEL', value: summary.lessDiesel || 0 },
    { templateRow: 15, key: 'lessCashAdvance', label: 'LESS: CASH ADVANCE', value: summary.lessCashAdvance || 0 },
    { templateRow: 16, key: 'lessShortage', label: 'LESS: SHORTAGE', value: summary.lessShortage || 0 },
    { templateRow: 17, key: 'lessTds', label: 'LESS: TDS', value: summary.lessTds || 0 },
    { templateRow: 18, key: 'roundOff', label: 'ROUND OFF', value: summary.roundOff || 0 },
    { templateRow: 19, key: 'netPayable', label: 'NET PAYABLE', value: summary.netPayable || 0 }
  ];
}

function headerPlaceholders(run, block) {
  const context = run.exportContext || {};
  return {
    '{{TRANSPORT_COMPANY}}': context.transportCompany || '',
    '{{TRANSPORT_GST}}': context.transportGst || '',
    '{{OWNER_NAME}}': block.ownerNameSnapshot || '',
    '{{OWNER_PAN}}': block.ownerPanSnapshot || '',
    '{{CLIENT_COMPANY}}': context.clientCompany || '',
    '{{PLANT}}': context.plant || '',
    '{{FROM_DATE}}': formatDate(run.periodStart),
    '{{TO_DATE}}': formatDate(run.periodEnd)
  };
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return [String(date.getUTCDate()).padStart(2, '0'), String(date.getUTCMonth() + 1).padStart(2, '0'), date.getUTCFullYear()].join('/');
}

function renderOwnerBlock(templateSheet, targetSheet, run, block, targetStartRow) {
  const rows = block.rows || [];
  const detailCount = Math.max(rows.length, 1);
  const extraDetailRows = detailCount - 1;
  const summaryRows = block.summaryRows && block.summaryRows.length ? block.summaryRows : legacySummaryRows(block);

  for (let sourceRow = 1; sourceRow < SUMMARY_START_ROW; sourceRow += 1) {
    if (sourceRow === DETAIL_ROW) {
      for (let index = 0; index < detailCount; index += 1) {
        copyRow(templateSheet, targetSheet, DETAIL_ROW, targetStartRow + DETAIL_ROW - 1 + index);
      }
    } else {
      copyRow(
        templateSheet,
        targetSheet,
        sourceRow,
        mapTemplateRow(sourceRow, targetStartRow, extraDetailRows)
      );
    }
  }
  copyTemplateMerges(templateSheet, targetSheet, targetStartRow, extraDetailRows);

  const summaryStartRow = targetStartRow + SUMMARY_START_ROW - 1 + extraDetailRows;
  renderSummaryRows(templateSheet, targetSheet, summaryStartRow, summaryRows);
  const blockEndRow = summaryStartRow + summaryRows.length - 1;
  replacePlaceholders(targetSheet, targetStartRow, blockEndRow, headerPlaceholders(run, block));
  rows.forEach((row, index) => renderTripRow(targetSheet, targetStartRow + DETAIL_ROW - 1 + index, row, index));
  if (rows.length === 0) replacePlaceholders(targetSheet, targetStartRow + DETAIL_ROW - 1, targetStartRow + DETAIL_ROW - 1, {});
  renderTotals(targetSheet, targetStartRow + TOTAL_ROW - 1 + extraDetailRows, block);
  return blockEndRow;
}

function safeSheetName(name, usedNames) {
  const base = String(name || 'Owner').replace(/[\\/*?:[\]]/g, '').trim().slice(0, 31) || 'Owner';
  let candidate = base;
  let suffix = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    const ending = ` ${suffix}`;
    candidate = `${base.slice(0, 31 - ending.length)}${ending}`;
    suffix += 1;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function assertNoPlaceholders(workbook) {
  const unresolved = [];
  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => row.eachCell((cell) => {
      if (typeof cell.value === 'string' && /{{[A-Z_]+}}/.test(cell.value)) {
        unresolved.push(`${sheet.name}!${cell.address}`);
      }
    }));
  });
  if (unresolved.length) throw new Error(`Unresolved payment template placeholders: ${unresolved.join(', ')}`);
}

export async function buildPaymentWorkbook({ run, blocks }) {
  const templateWorkbook = new ExcelJS.Workbook();
  await templateWorkbook.xlsx.readFile(TEMPLATE_PATH);
  const templateSheet = templateWorkbook.worksheets[0];
  if (!templateSheet) throw new Error('Payment template does not contain a worksheet');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Truck Load Payment Sheet System';
  workbook.created = new Date();
  const usedNames = new Set();

  const combinedSheet = workbook.addWorksheet(safeSheetName('Combined Payment Sheet', usedNames));
  copySheetSettings(templateSheet, combinedSheet);
  let nextBlockRow = 1;
  for (const block of blocks) {
    const endRow = renderOwnerBlock(templateSheet, combinedSheet, run, block, nextBlockRow);
    if (block !== blocks[blocks.length - 1]) {
        combinedSheet.getRow(endRow).addPageBreak();
    }

    nextBlockRow = endRow + 3;
    //nextBlockRow = endRow + BLOCK_SPACING_ROWS + 1;
  }

  for (const block of blocks) {
    const ownerSheet = workbook.addWorksheet(safeSheetName(block.ownerNameSnapshot, usedNames));
    copySheetSettings(templateSheet, ownerSheet);
    renderOwnerBlock(templateSheet, ownerSheet, run, block, 1);
  }

  assertNoPlaceholders(workbook);
  const excelBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return { excelBuffer, sheetCount: workbook.worksheets.length };
}

export const paymentTemplatePath = TEMPLATE_PATH;
