import { useState } from 'react';

export function PaymentPreview({ preview, onSave, onCancel, saving }) {
  const [blocks, setBlocks] = useState(preview.blocks || []);
  const settings = preview.settings || {};

  function buildSummaryRows(summaryValues = {}) {
    if (summaryValues.gstApplicable === false) {
      return [
        { key: 'taxableValue', label: 'TAXABLE VALUE', value: summaryValues.taxableValue || 0 },
        { key: 'lessDiesel', label: 'LESS: DIESEL', value: summaryValues.lessDiesel || 0 },
        { key: 'lessCashAdvance', label: 'LESS: CASH ADVANCE', value: summaryValues.lessCashAdvance || 0 },
        { key: 'lessShortage', label: 'LESS: SHORTAGE', value: summaryValues.lessShortage || 0 },
        { key: 'lessTds', label: 'LESS: TDS', value: summaryValues.lessTds || 0 },
        { key: 'roundOff', label: 'ROUND OFF', value: summaryValues.roundOff || 0 },
        { key: 'netPayable', label: 'NET PAYABLE', value: summaryValues.netPayable || 0 }
      ];
    }

    return [
      { key: 'taxableValue', label: 'TAXABLE VALUE', value: summaryValues.taxableValue || 0 },
      { key: 'cgst', label: `ADD: CGST @${summaryValues.cgstRate ?? settings.cgstRate ?? 0}%`, value: summaryValues.cgst || 0 },
      { key: 'sgst', label: `ADD: SGST @${summaryValues.sgstRate ?? settings.sgstRate ?? 0}%`, value: summaryValues.sgst || 0 },
      { key: 'netBillAmount', label: 'NET BILL AMOUNT', value: summaryValues.netBillAmount || 0 },
      { key: 'lessDiesel', label: 'LESS: DIESEL', value: summaryValues.lessDiesel || 0 },
      { key: 'lessCashAdvance', label: 'LESS: CASH ADVANCE', value: summaryValues.lessCashAdvance || 0 },
      { key: 'lessShortage', label: 'LESS: SHORTAGE', value: summaryValues.lessShortage || 0 },
      { key: 'lessTds', label: 'LESS: TDS', value: summaryValues.lessTds || 0 },
      { key: 'roundOff', label: 'ROUND OFF', value: summaryValues.roundOff || 0 },
      { key: 'netPayable', label: 'NET PAYABLE', value: summaryValues.netPayable || 0 }
    ];
  }

  function recalculateBlock(block, rows) {
    const gstApplicable = block.summaryValues?.gstApplicable !== false;
    const cgstRate = Number(block.summaryValues?.cgstRate ?? settings.cgstRate ?? 0);
    const sgstRate = Number(block.summaryValues?.sgstRate ?? settings.sgstRate ?? 0);
    let totalQty = 0;
    let totalAmount = 0;
    let totalCommission = 0;
    let totalGross = 0;
    let totalDiesel = 0;
    let totalCashAdvance = 0;
    let totalRfidGps = 0;
    let totalShortage = 0;
    let totalUrea = 0;
    let totalNetAmount = 0;

    const updatedRows = rows.map((row) => {
      const v = row.rowValues;
      const amount = v.qty * v.rate;
      const gross = amount - v.comm;
      const netAmount = gross - v.bagShortage - v.diesel - v.cashAdvance - v.rfidGps;

      totalQty += v.qty;
      totalAmount += amount;
      totalCommission += v.comm;
      totalGross += gross;
      totalDiesel += v.diesel;
      totalCashAdvance += v.cashAdvance;
      totalRfidGps += v.rfidGps;
      totalShortage += v.bagShortage;
      totalUrea += v.urea;
      totalNetAmount += netAmount;

      return {
        ...row,
        rowValues: {
          ...v,
          amount,
          gross,
          netAmount
        }
      };
    });

    const tdsPercentage = block.totals.totalGross > 0 ? (block.totals.totalTds / block.totals.totalGross) * 100 : 1;
    const tdsRate = Math.round(tdsPercentage) || 1;

    const taxableValue = totalGross;
    const cgst = gstApplicable ? taxableValue * (cgstRate / 100) : 0;
    const sgst = gstApplicable ? taxableValue * (sgstRate / 100) : 0;
    const netBillAmount = taxableValue + cgst + sgst;
    const lessDiesel = totalDiesel;
    const lessCashAdvance = totalCashAdvance;
    const lessShortage = totalShortage;
    const lessTds = Math.round(taxableValue * (tdsRate / 100));

    const unroundedNetPayable = (gstApplicable ? netBillAmount : taxableValue) - lessDiesel - lessCashAdvance - lessShortage - lessTds;
    const netPayable = Math.round(unroundedNetPayable);
    const roundOff = netPayable - unroundedNetPayable;
    const summaryRows = buildSummaryRows({
      gstApplicable,
      taxableValue,
      cgstRate,
      sgstRate,
      cgst,
      sgst,
      netBillAmount,
      lessDiesel,
      lessCashAdvance,
      lessShortage,
      lessTds,
      roundOff,
      netPayable
    });

    return {
      ...block,
      rows: updatedRows,
      totals: {
        totalQty,
        totalAmount,
        totalCommission,
        totalGross,
        totalDiesel,
        totalCashAdvance,
        totalRfidGps,
        totalShortage,
        totalTds: lessTds,
        totalGst: cgst + sgst,
        totalNetPayable: netPayable
      },
      summaryRows,
      summaryValues: {
        gstApplicable,
        cgstRate,
        sgstRate,
        cgstAmount: cgst,
        sgstAmount: sgst,
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
      }
    };
  }

  function handleRowChange(blockIdx, rowIdx, field, value) {
    const numeric = Number(value) || 0;
    const nextBlocks = [...blocks];
    const targetBlock = nextBlocks[blockIdx];
    const targetRows = [...targetBlock.rows];

    targetRows[rowIdx] = {
      ...targetRows[rowIdx],
      rowValues: {
        ...targetRows[rowIdx].rowValues,
        [field]: numeric
      }
    };

    nextBlocks[blockIdx] = recalculateBlock(targetBlock, targetRows);
    setBlocks(nextBlocks);
  }

  const overallTotals = blocks.reduce(
    (acc, b) => {
      acc.totalQty += b.totals.totalQty;
      acc.totalAmount += b.totals.totalAmount;
      acc.totalCommission += b.totals.totalCommission;
      acc.totalGross += b.totals.totalGross;
      acc.totalDiesel += b.totals.totalDiesel;
      acc.totalCashAdvance += b.totals.totalCashAdvance;
      acc.totalRfidGps += b.totals.totalRfidGps;
      acc.totalShortage += b.totals.totalShortage || 0;
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
      totalShortage: 0,
      totalTds: 0,
      totalGst: 0,
      totalNetPayable: 0
    }
  );

  const totalDeductions = (
    overallTotals.totalDiesel +
    overallTotals.totalCashAdvance +
    overallTotals.totalShortage +
    overallTotals.totalTds +
    overallTotals.totalRfidGps
  );

  return (
    <div className="payment-preview-container">
      <header className="preview-action-header">
        <div>
          <h3>Verify Payment Worksheets</h3>
          <p>Verify each imported row, confirm repeated-trip commission handling, and edit inputs before generating Excel.</p>
        </div>
        <div className="preview-btns">
          <button type="button" className="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="submit-btn"
            onClick={() => onSave(blocks, overallTotals)}
            disabled={saving}
          >
            {saving ? 'Saving & Exporting Worksheets...' : 'Finalize & Save Payout'}
          </button>
        </div>
      </header>

      {blocks.map((block, blockIdx) => (
        <section key={block.ownerId} className="owner-payment-block">
          <header className="owner-block-header">
            <div>
              <h4>{block.ownerNameSnapshot}</h4>
              <span>PAN: {block.ownerPanSnapshot || 'Missing PAN'}</span>
            </div>
            <div className="block-status-badge">
              {block.warnings?.length ? (
                <span className="badge warning">⚠ {block.warnings.join(', ')}</span>
              ) : (
                <span className="badge valid">Ready</span>
              )}
            </div>
          </header>

          <div className="table-wrap preview-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Truck No</th>
                  <th>Party Name</th>
                  <th>Dest.</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th>Comm</th>
                  <th title="Which commission rule was applied">Comm Source</th>
                  <th>Gross</th>
                  <th>Diesel</th>
                  <th>Cash Adv Date</th>
                  <th>Advance</th>
                  <th>RFID+GPS</th>
                  <th>Shortage</th>
                  <th>Net Amt</th>
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIdx) => {
                  const v = row.rowValues;
                  const dateStr = new Date(row.invoiceDate).toLocaleDateString();
                  const commSrc = row.commissionUsed?.source || '';
                  const isZeroedRepeated = commSrc === 'Commission Applied Above';

                  let commSourceBadge = null;
                  if (commSrc === 'Truck Rule') {
                    commSourceBadge = <span className="comm-badge truck" title="Matched a truck-specific rule">🚛 Truck</span>;
                  } else if (commSrc === 'Default Rule') {
                    commSourceBadge = <span className="comm-badge route" title="Matched an owner+route default rule">📋 Route</span>;
                  } else if (commSrc === 'Owner Default') {
                    commSourceBadge = <span className="comm-badge owner" title="Fell back to owner default commission">👤 Owner</span>;
                  } else if (isZeroedRepeated) {
                    commSourceBadge = <span className="comm-badge zeroed" title="Commission already applied in first trip of same truck+date">⬆ Applied Above</span>;
                  }

                  return (
                    <tr key={`${row.truckNo}-${row.invoiceDate}-${rowIdx}`} className={`${isZeroedRepeated ? 'repeated-trip-row' : ''}`}>
                      <td>
                        {dateStr} {row.repeatedTrip && <span className="merged-tag">Repeated</span>}
                      </td>
                      <td>{row.truckNo}</td>
                      <td>{row.partyName || ''}</td>
                      <td>{row.destination || ''}</td>
                      <td>
                        <input
                          type="number"
                          value={v.qty}
                          className="table-input"
                          onChange={(e) => handleRowChange(blockIdx, rowIdx, 'qty', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={v.rate}
                          className="table-input"
                          onChange={(e) => handleRowChange(blockIdx, rowIdx, 'rate', e.target.value)}
                        />
                      </td>
                      <td>{v.amount}</td>
                      <td>
                        <input
                          type="number"
                          value={v.comm}
                          className="table-input"
                          onChange={(e) => handleRowChange(blockIdx, rowIdx, 'comm', e.target.value)}
                        />
                      </td>
                      <td className="comm-source-cell">
                        {commSourceBadge}
                        <small>{row.commissionUsed?.type || ''} {row.commissionUsed?.value ?? ''}</small>
                      </td>
                      <td>{v.gross}</td>
                      <td>
                        <input
                          type="number"
                          value={v.diesel}
                          className="table-input"
                          onChange={(e) => handleRowChange(blockIdx, rowIdx, 'diesel', e.target.value)}
                        />
                      </td>
                      <td>{row.cashAdvanceDate ? new Date(row.cashAdvanceDate).toLocaleDateString() : ''}</td>
                      <td>
                        <input
                          type="number"
                          value={v.cashAdvance}
                          className="table-input"
                          onChange={(e) => handleRowChange(blockIdx, rowIdx, 'cashAdvance', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={v.rfidGps}
                          className="table-input"
                          onChange={(e) => handleRowChange(blockIdx, rowIdx, 'rfidGps', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={v.bagShortage}
                          className="table-input"
                          onChange={(e) => handleRowChange(blockIdx, rowIdx, 'bagShortage', e.target.value)}
                        />
                      </td>
                      <td>{v.netAmount}</td>
                    </tr>
                  );
                })}
                <tr className="totals-row">
                  <td colSpan="4">Total:</td>
                  <td>{block.totals.totalQty}</td>
                  <td></td>
                  <td>{block.totals.totalAmount}</td>
                  <td>{block.totals.totalCommission}</td>
                  <td></td>
                  <td>{block.totals.totalGross}</td>
                  <td>{block.totals.totalDiesel}</td>
                  <td></td>
                  <td>{block.totals.totalCashAdvance}</td>
                  <td>{block.totals.totalRfidGps}</td>
                  <td>{block.totals.totalShortage}</td>
                  <td>{block.rows.reduce((sum, r) => sum + r.rowValues.netAmount, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="block-summary-card">
            <h5>Calculation Breakdown</h5>
            <div className="summary-split-grid">
              <div className="summary-left-side">
                {buildSummaryRows(block.summaryValues).slice(0, block.summaryValues?.gstApplicable === false ? 1 : 4).map((row) => (
                  <div key={row.key} className={row.key === 'netBillAmount' ? 'strong-total' : ''}>
                    <span>{row.label}</span>
                    <strong>{Number(row.value).toFixed(2)}</strong>
                  </div>
                ))}
              </div>
              <div className="summary-right-side">
                {buildSummaryRows(block.summaryValues).slice(block.summaryValues?.gstApplicable === false ? 1 : 4).map((row) => (
                  <div key={row.key} className={row.key === 'netPayable' ? 'payable-highlight' : ''}>
                    <span>{row.label}</span>
                    <strong>{row.key === 'netPayable' ? `₹${Number(row.value).toFixed(0)}` : `-${Number(row.value).toFixed(2)}`}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}

      <footer className="overall-summary-card">
        <h3>Payout Generation Summary</h3>
        <div className="overall-stats-grid">
          <div>
            <span>Total Qty</span>
            <strong>{overallTotals.totalQty.toFixed(2)}</strong>
          </div>
          <div>
            <span>Total Amount</span>
            <strong>₹{overallTotals.totalAmount.toFixed(2)}</strong>
          </div>
          <div>
            <span>Total Commission</span>
            <strong>₹{overallTotals.totalCommission.toFixed(2)}</strong>
          </div>
          <div>
            <span>CGST + SGST</span>
            <strong>₹{overallTotals.totalGst.toFixed(2)}</strong>
          </div>
          <div className="payout-total">
            <span>Net Payable</span>
            <strong>₹{overallTotals.totalNetPayable}</strong>
          </div>
        </div>

        <div className="overall-breakdown-grid" style={{ marginTop: 16 }}>
          <h5 style={{ margin: '0 0 8px 0', color: '#e2e8f0' }}>Deductions Breakdown</h5>
          <div className="overall-breakdown-items" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <span>Diesel</span>
              <div style={{ fontWeight: 700 }}>₹{Number(overallTotals.totalDiesel || 0).toFixed(2)}</div>
            </div>
            <div>
              <span>Cash Advance</span>
              <div style={{ fontWeight: 700 }}>₹{Number(overallTotals.totalCashAdvance || 0).toFixed(2)}</div>
            </div>
            <div>
              <span>RFID + GPS</span>
              <div style={{ fontWeight: 700 }}>₹{Number(overallTotals.totalRfidGps || 0).toFixed(2)}</div>
            </div>
            <div>
              <span>Shortage</span>
              <div style={{ fontWeight: 700 }}>₹{Number(overallTotals.totalShortage || 0).toFixed(2)}</div>
            </div>
            <div>
              <span>TDS</span>
              <div style={{ fontWeight: 700 }}>₹{Number(overallTotals.totalTds || 0).toFixed(2)}</div>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Total Deductions</span>
              <div style={{ fontWeight: 800, color: '#fca5a5' }}>-₹{Number(totalDeductions).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
