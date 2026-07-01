import { useEffect, useMemo, useState } from 'react';

const FIELD_DEFS = [
  { key: 'invNo', label: 'Invoice No', type: 'text' },
  { key: 'invDate', label: 'Invoice Date', type: 'text' },
  { key: 'grRrNo', label: 'GR/RR No', type: 'text' },
  { key: 'diNo', label: 'DI No', type: 'text' },
  { key: 'partyName', label: 'Depot / Party Name', type: 'text' },
  { key: 'destination', label: 'Destination', type: 'text' },
  { key: 'productName', label: 'Product Name', type: 'text' },
  { key: 'truckNo', label: 'Truck No', type: 'text' },
  { key: 'truckOwnerName', label: 'Truck Owner Name', type: 'text' },
  { key: 'panNo', label: 'PAN No', type: 'text' },
  { key: 'qty', label: 'Qty', type: 'number' },
  { key: 'frtPmt', label: 'FRT-PMT', type: 'number' },
  { key: 'frtAmt', label: 'FRT AMT', type: 'number' },
  { key: 'billNo', label: 'Bill No', type: 'text' },
  { key: 'billDate', label: 'Bill Date', type: 'text' },
  { key: 'rfidTag', label: 'RFID Tag', type: 'number' },
  { key: 'gpsInstall', label: 'GPS Install', type: 'number' },
  { key: 'lessDieselLtr', label: 'Less: Diesel (Ltr)', type: 'number' },
  { key: 'dieselAmount', label: 'Diesel Amount', type: 'text' },
  { key: 'lessAdvance', label: 'Less: Advance', type: 'number' },
  { key: 'urea', label: 'Urea', type: 'number' },
  { key: 'bagShortage', label: 'Bag Shortage', type: 'number' }
];

function normalizeInputValue(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value);
}

function buildDraft(row) {
  return FIELD_DEFS.reduce((draft, field) => {
    draft[field.key] = normalizeInputValue(row?.normalizedRow?.[field.key]);
    return draft;
  }, {});
}

function fieldIssues(row, fieldKey) {
  return (row?.validationMessages || []).filter((item) => item.field === fieldKey);
}

export function ImportRowEditor({ row, onClose, onSave, onApprove, onReject, busy }) {
  const initialDraft = useMemo(() => buildDraft(row), [row]);
  const [draft, setDraft] = useState(initialDraft);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  if (!row) return null;

  function handleChange(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const rfidGps = (Number(draft.rfidTag) || 0) + (Number(draft.gpsInstall) || 0);
  const dieselRaw = row.normalizedRow?.dieselAmountRaw ?? '';

  return (
    <section className="panel-surface row-editor">
      <div className="section-header compact">
        <div>
          <p className="eyebrow">Row review</p>
          <h3>Row Editor</h3>
          <p>Sheet {row.sourceSheetName || row.sheetName} &mdash; Row {row.sourceRowNumber || row.rowNumber}</p>
        </div>
        <button type="button" className="secondary" onClick={onClose}>Close</button>
      </div>

      <div className="row-editor-summary">
        <span className="summary-pill">Truck: {row.normalizedRow?.truckNo || '-'}</span>
        <span className="summary-pill">Owner: {row.normalizedRow?.truckOwnerName || '-'}</span>
        <span className="summary-pill">PAN: {row.normalizedRow?.panNo || '-'}</span>
        <span className="summary-pill">RFID+GPS: {rfidGps || '-'}</span>
      </div>

      <div className="row-editor-grid">
        {FIELD_DEFS.map((field) => {
          const issues = fieldIssues(row, field.key);
          return (
            <label key={field.key} className={`field-shell ${issues.length ? 'has-field-issue' : ''}`}>
              <span className="field-label">
                {field.label}
                {issues.length > 0 && (
                  <span className={`field-badge ${issues[0].severity}`}>
                    {issues[0].severity === 'error' ? '✕' : '⚠'}
                  </span>
                )}
              </span>
              <input
                type={field.type}
                value={draft[field.key] ?? ''}
                onChange={(event) => handleChange(field.key, event.target.value)}
              />
              {issues.map((issue, index) => (
                <small key={`${issue.field}-${index}`} className={`field-issue-text ${issue.severity}`}>
                  {issue.message}
                </small>
              ))}
            </label>
          );
        })}

        <label className="field-shell readonly-field">
          <span className="field-label">RFID + GPS (combined)</span>
          <input type="number" value={rfidGps} readOnly disabled />
        </label>
        {dieselRaw && (
          <label className="field-shell readonly-field">
            <span className="field-label">Diesel Raw Value</span>
            <input type="text" value={dieselRaw} readOnly disabled />
          </label>
        )}
      </div>

      <div className="row-editor-notes">
        <strong>Validation Messages</strong>
        {row.validationMessages?.length ? (
          <ul>
            {row.validationMessages.map((item, index) => (
              <li key={`${item.field}-${index}`} className={item.severity}>
                <span className="severity-tag">{item.severity.toUpperCase()}</span> {item.message}
              </li>
            ))}
          </ul>
        ) : (
          <p>No validation issues.</p>
        )}
      </div>

      <div className="row-editor-actions">
        <button type="button" onClick={() => onSave(row, draft)} disabled={busy}>Save Row</button>
        <button type="button" className="approve-btn" onClick={() => onApprove(row)} disabled={busy}>Approve Row</button>
        <button type="button" className="reject-btn" onClick={() => onReject(row)} disabled={busy}>Reject Row</button>
      </div>
    </section>
  );
}
