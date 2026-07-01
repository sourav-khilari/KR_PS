import { useEffect, useState } from 'react';
import { useAuth } from '../modules/auth/AuthContext.jsx';
import { listPaymentRunsApi, getExcelExportUrl } from '../services/api.js';

export function PaymentHistory() {
  const { token } = useAuth();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadRuns() {
      setLoading(true);
      setError('');
      try {
        const data = await listPaymentRunsApi(token);
        setRuns(data);
      } catch (err) {
        setError('Failed to load payout history: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadRuns();
  }, [token]);

  function handleDownload(runId) {
    const url = getExcelExportUrl(runId, token);
    window.open(url, '_blank');
  }

  return (
    <div className="payment-history-container">
      <h3>Payout Sheets Generated History</h3>
      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <p>Loading run history logs...</p>
      ) : (
        <div className="table-wrap history-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date Generated</th>
                <th>Period Start</th>
                <th>Period End</th>
                <th>No. of Owners Included</th>
                <th>Total Qty</th>
                <th>Total Gross Amount</th>
                <th>Total CGST/SGST</th>
                <th>Total Net Payable</th>
                <th>File Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const dateStr = new Date(run.generatedAt || run.createdAt).toLocaleString();
                const startStr = new Date(run.periodStart).toLocaleDateString();
                const endStr = new Date(run.periodEnd).toLocaleDateString();
                const ownerCount = run.selectedOwners?.length || 0;
                return (
                  <tr key={run._id}>
                    <td>{dateStr}</td>
                    <td>{startStr}</td>
                    <td>{endStr}</td>
                    <td>{ownerCount} Owners</td>
                    <td>{run.totals?.totalQty?.toFixed(2)}</td>
                    <td>₹{run.totals?.totalGross}</td>
                    <td>₹{run.totals?.totalGst?.toFixed(2)}</td>
                    <td className="payable-cell">₹{run.totals?.totalNetPayable}</td>
                    <td>
                      <span className="badge approved">Exported</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="download-btn"
                        onClick={() => handleDownload(run._id)}
                      >
                        Download Excel (.xlsx)
                      </button>
                    </td>
                  </tr>
                );
              })}
              {runs.length === 0 && (
                <tr>
                  <td colSpan="10" className="empty-cell">
                    No payment runs have been generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
