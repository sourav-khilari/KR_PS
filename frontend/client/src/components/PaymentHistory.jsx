import { useEffect, useState } from 'react';
import { useAuth } from '../modules/auth/AuthContext.jsx';
import { deletePaymentRunApi, listPaymentRunsApi, getExcelExportUrl } from '../services/api.js';

export function PaymentHistory() {
  const { token } = useAuth();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingRunId, setDeletingRunId] = useState('');
  const [pendingDeleteRun, setPendingDeleteRun] = useState(null);

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

  async function handleDeleteConfirmed() {
    if (!pendingDeleteRun) return;
    setDeletingRunId(pendingDeleteRun._id);
    setError('');
    setSuccess('');
    try {
      await deletePaymentRunApi(pendingDeleteRun._id, token);
      setRuns((current) => current.filter((run) => run._id !== pendingDeleteRun._id));
      setSuccess('Payment sheet deleted successfully.');
    } catch (err) {
      setError(err.message || 'Failed to delete payment sheet.');
    } finally {
      setDeletingRunId('');
      setPendingDeleteRun(null);
    }
  }

  return (
    <div className="payment-history-container">
      <h3>Payout Sheets Generated History</h3>
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

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
                      <div className="history-action-group">
                        <button
                          type="button"
                          className="download-btn"
                          onClick={() => handleDownload(run._id)}
                        >
                          Download Excel (.xlsx)
                        </button>
                        <button
                          type="button"
                          className="delete-btn"
                          disabled={deletingRunId === run._id}
                          onClick={() => setPendingDeleteRun(run)}
                        >
                          {deletingRunId === run._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
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

      {pendingDeleteRun && (
        <div className="modal-backdrop">
          <div className="modal-card confirm-modal">
            <h4>Delete payment sheet?</h4>
            <p>Are you sure you want to delete this payment sheet history record?</p>
            <div className="table-actions">
              <button type="button" className="secondary" onClick={() => setPendingDeleteRun(null)}>
                Cancel
              </button>
              <button type="button" className="danger-btn" onClick={handleDeleteConfirmed} disabled={deletingRunId === pendingDeleteRun._id}>
                {deletingRunId === pendingDeleteRun._id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
