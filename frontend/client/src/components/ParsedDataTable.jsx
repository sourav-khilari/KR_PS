function hasIssue(row, field) {
  return row.validationMessages?.some((item) => item.field === field);
}

function issueClass(row, field) {
  const issue = row.validationMessages?.find((item) => item.field === field);
  if (!issue) return '';
  return issue.severity === 'error' ? 'cell-error' : 'cell-warning';
}

function statusBadge(row) {
  const approval = row.approvalStatus || 'pending';
  const edit = row.editStatus || 'unchanged';
  if (approval === 'approved') return <span className="status-pill approved">Approved</span>;
  if (approval === 'rejected') return <span className="status-pill rejected">Rejected</span>;
  if (edit === 'edited') return <span className="status-pill edited">Edited</span>;
  const hasErrors = row.validationMessages?.some((item) => item.severity === 'error');
  if (hasErrors) return <span className="status-pill error">Errors</span>;
  const hasWarnings = row.validationMessages?.some((item) => item.severity === 'warning');
  if (hasWarnings) return <span className="status-pill warning">Warnings</span>;
  return <span className="status-pill pending">Valid</span>;
}

function issueSummary(row) {
  const issues = row.validationMessages || [];
  if (!issues.length) return <span className="pill neutral">No issues</span>;
  return (
    <div className="issue-stack">
      {issues.slice(0, 2).map((issue, index) => (
        <span key={`${issue.field}-${index}`} className={`pill ${issue.severity === 'error' ? 'error' : 'warning'}`}>
          {issue.message}
        </span>
      ))}
      {issues.length > 2 && <span className="pill neutral">+{issues.length - 2} more</span>}
    </div>
  );
}

export function ParsedDataTable({ rows, onEditRow }) {
  return (
    <section className="panel-surface data-table-wrap">
      <div className="section-header compact">
        <div>
          <h3>Parsed rows</h3>
          <p>Warnings and validation issues appear directly beside each affected row.</p>
        </div>
      </div>
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
              <th>Issues</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const n = row.normalizedRow || {};
              return (
                <tr key={`${row.sourceSheetName || row.sheetName}-${row.sourceRowNumber || row.rowNumber}-${index}`} className={row.validationMessages?.length ? 'has-issue' : ''}>
                  <td>{row.sourceSheetName || row.sheetName}</td>
                  <td>{row.sourceRowNumber || row.rowNumber}</td>
                  <td>{n.invNo || '-'}</td>
                  <td className={issueClass(row, 'truckNo')}>{n.truckNo || '-'}</td>
                  <td className={issueClass(row, 'truckOwnerName')}>{n.truckOwnerName || '-'}</td>
                  <td className={issueClass(row, 'panNo')}>{n.panNo || '-'}</td>
                  <td>{n.qty ?? '-'}</td>
                  <td>{n.frtPmt ?? '-'}</td>
                  <td>{n.frtAmt ?? '-'}</td>
                  <td title={n.dieselAmountRaw || ''}>{n.dieselAmount ?? '-'}</td>
                  <td>{n.rfidTag ?? '-'}</td>
                  <td>{n.gpsInstall ?? '-'}</td>
                  <td>{n.lessAdvance ?? '-'}</td>
                  <td>{statusBadge(row)}</td>
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
    </section>
  );
}
