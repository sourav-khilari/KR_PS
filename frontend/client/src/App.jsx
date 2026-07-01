import { useEffect, useMemo, useState } from 'react';
import { UploadPage } from './components/UploadPage.jsx';
import { ImportedDataCenter } from './components/ImportedDataCenter.jsx';
import { ImportPreviewTable } from './components/ImportPreviewTable.jsx';
import { ImportRowEditor } from './components/ImportRowEditor.jsx';
import { PaymentTab } from './components/PaymentTab.jsx';
import { ProtectedRoute } from './modules/auth/ProtectedRoute.jsx';
import { useAuth } from './modules/auth/AuthContext.jsx';
import { MasterManagementShell } from './modules/masterData/MasterManagementShell.jsx';
import {
  approveImportRow,
  cancelImportSession,
  getImportSession,
  listClientCompanies,
  listImportSessions,
  listPlants,
  listTransportCompanies,
  previewMasterImport,
  rejectImportRow,
  saveMasterImport,
  updateImportRow
} from './services/api.js';

function Workspace() {
  const { token, user, logout } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState('imports');
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [error, setError] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);
  const [transportCompanies, setTransportCompanies] = useState([]);
  const [clientCompanies, setClientCompanies] = useState([]);
  const [plants, setPlants] = useState([]);
  const [importSessions, setImportSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const rows = preview?.rows || [];
  const messages = useMemo(() => rows.flatMap((row) => row.validationMessages || []), [rows]);
  const hasPreview = rows.length > 0;

  const stats = useMemo(() => {
    const errors = messages.filter((item) => item.severity === 'error').length;
    const warnings = messages.filter((item) => item.severity === 'warning').length;
    return { errors, warnings };
  }, [messages]);

  async function handlePreview({ file, gstRate, transportCompanyId, clientCompanyId, plantId }) {
    setIsLoading(true);
    setError('');
    setSaveResult(null);
    setSelectedRow(null);

    try {
      const result = await previewMasterImport({
        file,
        gstRate,
        transportCompanyId,
        clientCompanyId,
        plantId,
        token
      });
      setPreview(result);
      await fetchImportSessions();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshSession(sessionId) {
    const details = await getImportSession(sessionId, token);
    setPreview((current) =>
      current
        ? {
            ...current,
            session: details.session,
            rows: details.rows
          }
        : { session: details.session, rows: details.rows }
    );

    setSelectedRow((current) => {
      if (!current) return current;
      return details.rows.find((row) => row._id === current._id) || null;
    });
  }

  async function handleEditRow(row) {
    setSelectedRow(row);
  }

  async function handleSaveRow(row, draft) {
    if (!preview?.session?._id) return;
    setIsLoading(true);
    setError('');

    try {
      await updateImportRow(preview.session._id, row._id, { normalizedRow: draft }, token);
      await refreshSession(preview.session._id);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApproveRow(row) {
    if (!preview?.session?._id) return;
    setIsLoading(true);
    setError('');

    try {
      await approveImportRow(preview.session._id, row._id, token);
      await refreshSession(preview.session._id);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRejectRow(row) {
    if (!preview?.session?._id) return;
    setIsLoading(true);
    setError('');

    try {
      await rejectImportRow(preview.session._id, row._id, token);
      await refreshSession(preview.session._id);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!preview?.session?._id) return;
    setIsLoading(true);
    setError('');

    try {
      const result = await saveMasterImport(preview.session._id, token);
      setSaveResult(result);
      await fetchImportSessions();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCancelSession() {
    if (!preview?.session?._id) return;
    setIsLoading(true);
    setError('');

    try {
      await cancelImportSession(preview.session._id, token);
      setPreview(null);
      setSelectedRow(null);
      await fetchImportSessions();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchTransportMasterOptions() {
    try {
      const [transports, clients, plantsData] = await Promise.all([
        listTransportCompanies(token, { limit: 100 }),
        listClientCompanies(token, { limit: 100 }),
        listPlants(token, { limit: 100 })
      ]);

      setTransportCompanies(transports.items || []);
      setClientCompanies(clients.items || []);
      setPlants(plantsData.items || []);
    } catch (error) {
      console.error('Failed to fetch master options', error);
    }
  }

  async function fetchImportSessions() {
    try {
      const sessions = await listImportSessions(token);
      setImportSessions(sessions || []);
    } catch (error) {
      console.error('Failed to fetch import sessions', error);
    }
  }

  async function handleSelectSession(sessionId) {
    setActiveSessionId(sessionId);
    await refreshSession(sessionId);
  }

  useEffect(() => {
    fetchTransportMasterOptions();
    fetchImportSessions();
  }, [token]);

  return (
    <main className="app-shell authenticated-shell">
      <aside className="login-panel">
        <h1>Truck Load Payments</h1>
        <p>{user?.name}</p>
        <p className="role-label">{user?.role}</p>

        <nav className="nav-menu">
          <button
            type="button"
            className={`nav-item-btn ${activeMainTab === 'imports' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('imports')}
          >
            Upload Master Excel
          </button>
          <button
            type="button"
            className={`nav-item-btn ${activeMainTab === 'imported' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('imported')}
          >
            Imported Data Center
          </button>
          <button
            type="button"
            className={`nav-item-btn ${activeMainTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('payments')}
          >
            Payment Workflow
          </button>
          <button
            type="button"
            className={`nav-item-btn ${activeMainTab === 'masters' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('masters')}
          >
            Master Management
          </button>
        </nav>

        <button type="button" className="logout-btn" onClick={logout}>
          Logout
        </button>
      </aside>

      <section className="workspace">
        {activeMainTab === 'imports' ? (
          <>
            <section className="panel-surface import-history-panel">
              <div className="section-header compact">
                <div>
                  <p className="eyebrow">Session history</p>
                  <h2>Import Sessions</h2>
                </div>
                <button type="button" onClick={fetchImportSessions} disabled={isLoading}>
                  Refresh
                </button>
              </div>
              <div className="table-shell">
                {importSessions.length === 0 ? (
                  <div className="empty-state compact">
                    <p>No import sessions yet.</p>
                  </div>
                ) : (
                  <table className="data-table compact-table">
                    <thead>
                      <tr>
                        <th>File</th>
                        <th>Status</th>
                        <th>Rows</th>
                        <th>Valid</th>
                        <th>Warnings</th>
                        <th>Errors</th>
                        <th>Transport</th>
                        <th>Client</th>
                        <th>Plant</th>
                        <th>Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importSessions.map((session) => (
                        <tr
                          key={session._id}
                          className={activeSessionId === session._id ? 'selected-row' : ''}
                          onClick={() => handleSelectSession(session._id)}
                        >
                          <td>{session.fileName}</td>
                          <td><span className="status-pill pending">{session.status}</span></td>
                          <td>{session.rowCount}</td>
                          <td>{session.validCount}</td>
                          <td>{session.warningCount}</td>
                          <td>{session.errorCount}</td>
                          <td>{session.transportCompanyId?.companyName || '-'}</td>
                          <td>{session.clientCompanyId?.companyName || '-'}</td>
                          <td>{session.plantId?.plantName || '-'}</td>
                          <td>{new Date(session.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
            <UploadPage
              onPreview={handlePreview}
              isLoading={isLoading}
              transportCompanies={transportCompanies}
              clientCompanies={clientCompanies}
              plants={plants}
            />

            {error && <div className="alert error">{error}</div>}
            {saveResult && (
              <div className="alert success">
                Saved import {saveResult.id} with {saveResult.rowCount} rows.
              </div>
            )}

            {preview && (
              <>
                <section className="panel-surface preview-summary">
                  <div className="section-header compact">
                    <div>
                      <p className="eyebrow">Preview details</p>
                      <h3>{preview.session?.fileName || preview.fileName}</h3>
                    </div>
                    <div className="action-row">
                      <button type="button" onClick={handleSave} disabled={!hasPreview || isLoading}>
                        Save Session
                      </button>
                      <button type="button" className="secondary" onClick={handleCancelSession} disabled={isLoading}>
                        Cancel Session
                      </button>
                    </div>
                  </div>
                  <div className="summary-grid preview-meta">
                    <span className="summary-pill">{preview.session?.rowCount ?? preview.rowCount} parsed rows</span>
                    <span className="summary-pill">Transport: {preview.session?.transportCompanyId?.companyName || 'N/A'}</span>
                    <span className="summary-pill">Client: {preview.session?.clientCompanyId?.companyName || 'N/A'}</span>
                    <span className="summary-pill">Plant: {preview.session?.plantId?.plantName || 'N/A'}</span>
                  </div>
                </section>
                <ImportPreviewTable rows={rows} onEditRow={handleEditRow} />
                <ImportRowEditor
                  row={selectedRow}
                  onClose={() => setSelectedRow(null)}
                  onSave={handleSaveRow}
                  onApprove={handleApproveRow}
                  onReject={handleRejectRow}
                  busy={isLoading}
                />
              </>
            )}
          </>
        ) : activeMainTab === 'imported' ? (
          <ImportedDataCenter />
        ) : activeMainTab === 'payments' ? (
          <PaymentTab />
        ) : (
          <MasterManagementShell />
        )}
      </section>
    </main>
  );
}

export default function App() {
  return (
    <ProtectedRoute>
      <Workspace />
    </ProtectedRoute>
  );
}
