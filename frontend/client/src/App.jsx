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
  listClientCompanies,
  listPlants,
  listTransportCompanies,
  previewMasterImport,
  saveMasterImport,
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

  const rows = preview?.rows || [];
  const messages = useMemo(() => rows.flatMap((row) => row.validationMessages || []), [rows]);
  const hasPreview = rows.length > 0;

  function getSelectedTransportCompany(id) {
    return transportCompanies.find((item) => item._id === id) || null;
  }

  function getSelectedClientCompany(id) {
    return clientCompanies.find((item) => item._id === id) || null;
  }

  function getSelectedPlant(id) {
    return plants.find((item) => item._id === id) || null;
  }

  function buildPreviewMetadata(transportCompanyId, clientCompanyId, plantId) {
    return {
      transportCompanyId,
      clientCompanyId,
      plantId,
      transportCompany: getSelectedTransportCompany(transportCompanyId),
      clientCompany: getSelectedClientCompany(clientCompanyId),
      plant: getSelectedPlant(plantId)
    };
  }

  function getPreviewRowKey(row) {
    return row?._id || `${row?.sourceSheetName || row?.sheetName || 'sheet'}-${row?.sourceRowNumber || row?.rowNumber || ''}`;
  }

  function updatePreviewRows(updater) {
    setPreview((current) => {
      if (!current) return current;
      return {
        ...current,
        rows: updater(current.rows || [])
      };
    });
  }

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
      setPreview({
        ...result,
        metadata: buildPreviewMetadata(transportCompanyId, clientCompanyId, plantId)
      });
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEditRow(row) {
    setSelectedRow(row);
  }

  async function handleSaveRow(row, draft) {
    if (!preview) return;

    updatePreviewRows((currentRows) => currentRows.map((currentRow) => (
      getPreviewRowKey(currentRow) === getPreviewRowKey(row)
        ? {
            ...currentRow,
            normalizedRow: {
              ...currentRow.normalizedRow,
              ...draft
            },
            editStatus: 'edited',
            approvalStatus: 'pending'
          }
        : currentRow
    )));
    setSelectedRow(null);
  }

  async function handleApproveRow(row) {
    if (!preview) return;

    updatePreviewRows((currentRows) => currentRows.map((currentRow) => (
      getPreviewRowKey(currentRow) === getPreviewRowKey(row)
        ? { ...currentRow, approvalStatus: 'approved' }
        : currentRow
    )));
    setSelectedRow(null);
  }

  async function handleRejectRow(row) {
    if (!preview) return;

    updatePreviewRows((currentRows) => currentRows.map((currentRow) => (
      getPreviewRowKey(currentRow) === getPreviewRowKey(row)
        ? { ...currentRow, approvalStatus: 'rejected' }
        : currentRow
    )));
    setSelectedRow(null);
  }

  async function handleSave() {
    if (!preview) return;
    setIsLoading(true);
    setError('');

    try {
      const result = await saveMasterImport(
        {
          fileName: preview.session?.fileName || preview.fileName,
          transportCompanyId: preview.metadata?.transportCompanyId || preview.session?.transportCompanyId || '',
          clientCompanyId: preview.metadata?.clientCompanyId || preview.session?.clientCompanyId || '',
          plantId: preview.metadata?.plantId || preview.session?.plantId || '',
          sheetNames: preview.parsed?.sheets?.map((sheet) => sheet.sheetName) || preview.session?.sheetNames || [],
          rows: preview.rows || []
        },
        token
      );
      setSaveResult(result);
      await fetchImportSessions();
      setPreview(null);
      setSelectedRow(null);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCancelSession() {
    setPreview(null);
    setSelectedRow(null);
    setError('');
    setSaveResult(null);
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

  useEffect(() => {
    fetchTransportMasterOptions();
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
                    <span className="summary-pill">Transport: {preview.metadata?.transportCompany?.companyName || ''}</span>
                    <span className="summary-pill">Client: {preview.metadata?.clientCompany?.companyName || ''}</span>
                    <span className="summary-pill">Plant: {preview.metadata?.plant?.plantName || ''}</span>
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
