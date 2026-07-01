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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [transportFilter, setTransportFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [plantFilter, setPlantFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

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

  const summaryCards = {
    payments: runs.length,
    generated: runs.filter((run) => run.status === 'generated').length,
    draft: runs.filter((run) => run.status === 'draft').length,
    exported: runs.filter((run) => run.outputFileName).length
  };

  const filteredRuns = runs.filter((run) => {
    const haystack = [
      run.outputFileName,
      run.exportContext?.transportCompany,
      run.exportContext?.clientCompany,
      run.exportContext?.plant,
      String(run.selectedOwners?.length || 0),
      run.status,
      new Date(run.periodStart).toLocaleDateString(),
      new Date(run.periodEnd).toLocaleDateString()
    ].join(' ').toLowerCase();

    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (statusFilter && run.status !== statusFilter) return false;
    if (transportFilter && !(run.exportContext?.transportCompany || '').toLowerCase().includes(transportFilter.toLowerCase())) return false;
    if (clientFilter && !(run.exportContext?.clientCompany || '').toLowerCase().includes(clientFilter.toLowerCase())) return false;
    if (plantFilter && !(run.exportContext?.plant || '').toLowerCase().includes(plantFilter.toLowerCase())) return false;
    if (ownerFilter && String(run.selectedOwners?.length || 0) !== ownerFilter) return false;
    if (dateFilter) {
      const generatedDate = new Date(run.generatedAt || run.createdAt).toISOString().slice(0, 10);
      if (generatedDate !== dateFilter) return false;
    }
    return true;
  });

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
    <div className="payment-history-container dashboard-page-shell">
      <header className="page-hero history-hero">
        <div>
          <p className="eyebrow">Workflow archive</p>
          <h3>Payment History</h3>
          <p className="muted-copy">Review saved payment runs, export files, and manage history from one organized dashboard.</p>
        </div>
        <div className="hero-chip-stack">
          <span className="summary-pill">{summaryCards.payments} payments</span>
          <span className="summary-pill">{summaryCards.exported} exported</span>
        </div>
      </header>

      <div className="imported-data-center__summary imported-data-center__summary--wide">
        <div className="metric-card"><span>Payments</span><strong>{summaryCards.payments}</strong></div>
        <div className="metric-card"><span>Generated</span><strong>{summaryCards.generated}</strong></div>
        <div className="metric-card"><span>Draft</span><strong>{summaryCards.draft}</strong></div>
        <div className="metric-card"><span>Exported</span><strong>{summaryCards.exported}</strong></div>
      </div>

      <section className="panel-surface filter-panel-card payment-history-filters">
        <div className="section-header compact">
          <div>
            <h4>Filters</h4>
            <p className="muted-copy">Search and narrow the saved payment runs without changing the stored records.</p>
          </div>
        </div>
        <div className="filter-grid history-filter-grid">
          <label className="field-shell"><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Run, company, plant, owner count" /></label>
          <label className="field-shell"><span>Date</span><input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label>
          <label className="field-shell"><span>Transport Company</span><input value={transportFilter} onChange={(event) => setTransportFilter(event.target.value)} placeholder="Filter by transport" /></label>
          <label className="field-shell"><span>Client Company</span><input value={clientFilter} onChange={(event) => setClientFilter(event.target.value)} placeholder="Filter by client" /></label>
          <label className="field-shell"><span>Plant</span><input value={plantFilter} onChange={(event) => setPlantFilter(event.target.value)} placeholder="Filter by plant" /></label>
          <label className="field-shell"><span>Owner Count</span><input value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} placeholder="Exact owner count" /></label>
          <label className="field-shell"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All</option><option value="draft">Draft</option><option value="generated">Generated</option><option value="cancelled">Cancelled</option></select></label>
        </div>
      </section>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {loading ? (
        <div className="table-placeholder">Loading run history logs...</div>
      ) : (
        <div className="table-shell history-table-shell">
          <table className="data-table history-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Date</th>
                <th>Transport Company</th>
                <th>Client Company</th>
                <th>Plant</th>
                <th>Owner Count</th>
                <th>Payment Period</th>
                <th>Created By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => {
                const dateStr = new Date(run.generatedAt || run.createdAt).toLocaleString();
                const startStr = new Date(run.periodStart).toLocaleDateString();
                const endStr = new Date(run.periodEnd).toLocaleDateString();
                const ownerCount = run.selectedOwners?.length || 0;
                return (
                  <tr key={run._id}>
                    <td><span className={`status-pill ${run.status || 'pending'}`}>{run.status || 'pending'}</span></td>
                    <td>{dateStr}</td>
                    <td>{run.exportContext?.transportCompany || '-'}</td>
                    <td>{run.exportContext?.clientCompany || '-'}</td>
                    <td>{run.exportContext?.plant || '-'}</td>
                    <td>{ownerCount}</td>
                    <td>{startStr} - {endStr}</td>
                    <td>{run.generatedBy?.name || run.generatedBy?.email || '-'}</td>
                    <td>
                      <div className="history-action-menu">
                        <button type="button" className="secondary">Actions</button>
                        <div className="history-action-popover">
                          <button type="button" onClick={() => handleDownload(run._id)}>Preview / Excel</button>
                          <button type="button" onClick={() => handleDownload(run._id)}>Excel</button>
                          <button type="button" disabled>PDF</button>
                          <button type="button" disabled>View</button>
                          <button type="button" className="danger-btn" disabled={deletingRunId === run._id} onClick={() => setPendingDeleteRun(run)}>{deletingRunId === run._id ? 'Deleting...' : 'Delete'}</button>
                          <button type="button" disabled>Regenerate</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRuns.length === 0 && (
                <tr>
                  <td colSpan="9" className="empty-cell">
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
