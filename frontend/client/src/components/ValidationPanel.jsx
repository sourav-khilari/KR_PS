export function ValidationPanel({ status, messages, stats, sheetSummaries }) {
  return (
    <section className="panel-surface validation-panel">
      <div className="section-header compact">
        <div>
          <p className="eyebrow">Validation</p>
          <h2>Validation Summary</h2>
        </div>
        <span className={`status-pill ${status}`}>{status}</span>
      </div>

      <div className="summary-grid">
        <span className="summary-pill">{stats.errors} errors</span>
        <span className="summary-pill">{stats.warnings} warnings</span>
        <span className="summary-pill">{sheetSummaries.length} sheets checked</span>
      </div>

      <div className="sheet-list">
        {sheetSummaries.map((sheet) => (
          <span key={sheet.sheetName} className="pill neutral">
            {sheet.sheetName}: {sheet.status}
          </span>
        ))}
      </div>

      {messages.length === 0 ? (
        <p className="muted-copy">No validation issues found.</p>
      ) : (
        <ul className="message-list">
          {messages.slice(0, 30).map((item, index) => (
            <li key={`${item.rowNumber}-${item.field}-${index}`} className={item.severity}>
              <span className="severity-tag">Row {item.rowNumber}</span>
              <span>{item.field}: {item.message}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
