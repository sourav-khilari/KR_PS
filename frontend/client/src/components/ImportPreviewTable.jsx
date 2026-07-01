function getStatusClass(status) {
  switch (status) {
    case 'approved':
      return 'status-pill approved';
    case 'rejected':
      return 'status-pill rejected';
    default:
      return 'status-pill pending';
  }
}

function issueSummary(row) {
  const issues = row.validationMessages || [];
  if (!issues.length) {
    return <span className="pill neutral">No issues</span>;
  }

  return (
    <div className="issue-stack">
      {issues.slice(0, 3).map((issue, index) => (
        <span key={`${issue.field}-${index}`} className={`pill ${issue.severity === 'error' ? 'error' : 'warning'}`}>
          {issue.message}
        </span>
      ))}
      {issues.length > 3 && <span className="pill neutral">+{issues.length - 3} more</span>}
    </div>
  );
}

function rowClass(row) {
  if (!row.validationMessages?.length) return '';
  return row.validationMessages.some((item) => item.severity === 'error') ? 'has-issue error-row' : 'has-issue warning-row';
}

export function ImportPreviewTable({ rows, onEditRow }) {
  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Sheet</th>
            <th>Row</th>
            <th>Invoice</th>
            <th>Truck No</th>
            <th>Owner Name</th>
            <th>PAN</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
            <th>Diesel</th>
            <th>RFID</th>
            <th>GPS</th>
            <th>Advance</th>
            <th>Status</th>
            <th>Validation</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const n = row.normalizedRow || {};
            return (
              <tr key={`${row.sourceSheetName || row.sheetName}-${row.sourceRowNumber || row.rowNumber}-${index}`} className={rowClass(row)}>
                <td>{row.sourceSheetName || row.sheetName}</td>
                <td>{row.sourceRowNumber || row.rowNumber}</td>
                <td>{n.invNo || '-'}</td>
                <td>{n.truckNo || '-'}</td>
                <td>{n.truckOwnerName || '-'}</td>
                <td>{n.panNo || '-'}</td>
                <td>{n.qty ?? '-'}</td>
                <td>{n.frtPmt ?? '-'}</td>
                <td>{n.frtAmt ?? '-'}</td>
                <td title={n.dieselAmountRaw || ''}>{n.dieselAmount ?? '-'}</td>
                <td>{n.rfidTag ?? '-'}</td>
                <td>{n.gpsInstall ?? '-'}</td>
                <td>{n.lessAdvance ?? '-'}</td>
                <td><span className={getStatusClass(row.approvalStatus || 'pending')}>{row.approvalStatus || 'pending'}</span></td>
                <td>{issueSummary(row)}</td>
                <td>
                  <button type="button" onClick={() => onEditRow(row)}>
                    Edit
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
