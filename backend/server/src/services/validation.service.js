const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

function message(row, field, severity, text) {
  return {
    rowNumber: row.rowNumber,
    field,
    severity,
    message: text
  };
}

export function validateMasterRows(rows) {
  const allMessages = [];
  const ownerByTruck = new Map();

  const validatedRows = rows.map((row) => {
    const rowMessages = [];

    if (!row.truckNo) rowMessages.push(message(row, 'truckNo', 'error', 'Truck number is missing'));
    if (!row.ownerName) rowMessages.push(message(row, 'ownerName', 'error', 'Owner name is missing'));
    if (!row.ownerPan) {
      rowMessages.push(message(row, 'ownerPan', 'warning', 'Owner PAN is missing'));
    } else if (!PAN_PATTERN.test(row.ownerPan)) {
      rowMessages.push(message(row, 'ownerPan', 'warning', 'Owner PAN format looks suspicious'));
    }

    if (row.gstNo && !GST_PATTERN.test(row.gstNo)) {
      rowMessages.push(message(row, 'gstNo', 'warning', 'GST number format looks suspicious'));
    }

    if (row.truckNo && row.ownerName) {
      const priorOwner = ownerByTruck.get(row.truckNo);
      if (priorOwner && priorOwner !== row.ownerName.toLowerCase()) {
        rowMessages.push(message(row, 'ownerName', 'warning', 'Same truck number appears with a different owner name'));
      } else {
        ownerByTruck.set(row.truckNo, row.ownerName.toLowerCase());
      }
    }

    allMessages.push(...rowMessages);
    return {
      ...row,
      validationMessages: rowMessages
    };
  });

  const hasErrors = allMessages.some((item) => item.severity === 'error');
  const hasWarnings = allMessages.some((item) => item.severity === 'warning');

  return {
    rows: validatedRows,
    messages: allMessages,
    status: hasErrors ? 'errors' : hasWarnings ? 'warnings' : 'valid'
  };
}
