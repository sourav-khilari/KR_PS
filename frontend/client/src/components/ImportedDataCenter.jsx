import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../modules/auth/AuthContext.jsx';
import { approveImportRow, deleteImportRow, listClientCompanies, listOwnersApi, listPlants, listTransportCompanies, rejectImportRow, updateImportRow } from '../services/api.js';
import { DataCenterFilterPanel } from './DataCenterFilterPanel.jsx';
import { DataTableToolbar } from './DataTableToolbar.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const IMPORT_ROW_FIELDS = [
  { key: 'invNo', label: 'Invoice Number' },
  { key: 'invDate', label: 'Invoice Date', type: 'date' },
  { key: 'grRrNo', label: 'GR/RR No.' },
  { key: 'diNo', label: 'DI No.' },
  { key: 'partyName', label: 'Party Name' },
  { key: 'destination', label: 'Destination' },
  { key: 'productName', label: 'Product Name' },
  { key: 'truckNo', label: 'Truck Number' },
  { key: 'truckOwnerName', label: 'Truck Owner Name' },
  { key: 'panNo', label: 'PAN Number' },
  { key: 'qty', label: 'Qty', type: 'number' },
  { key: 'frtPmt', label: 'Freight Rate', type: 'number' },
  { key: 'frtAmt', label: 'Freight Amount', type: 'number' },
  { key: 'billNo', label: 'Bill No.' },
  { key: 'billDate', label: 'Bill Date', type: 'date' },
  { key: 'rfidTag', label: 'RFID Tag', type: 'number' },
  { key: 'gpsInstall', label: 'GPS Install', type: 'number' },
  { key: 'lessDieselLtr', label: 'Diesel Ltr', type: 'number' },
  { key: 'dieselAmount', label: 'Diesel Amount', type: 'number' },
  { key: 'lessAdvance', label: 'Less Advance', type: 'number' },
  { key: 'urea', label: 'Urea', type: 'number' },
  { key: 'bagShortage', label: 'Bag Shortage', type: 'number' }
];

const DEFAULT_FILTERS = {
  page: 1,
  limit: 100,
  invoiceNumber: '',
  truckNumber: '',
  owner: '',
  destination: '',
  status: '',
  transportCompanyId: '',
  clientCompanyId: '',
  plantId: '',
  startDate: '',
  endDate: ''
};

function formatDateValue(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'string') return value.slice(0, 10);
  return value;
}

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

function getIssueSummary(row) {
  const issues = row.validationMessages || [];
  if (!issues.length) return null;
  return issues.slice(0, 3).map((issue, index) => (
    <span key={`${issue.field}-${index}`} className={`pill ${issue.severity === 'error' ? 'error' : 'warning'}`}>
      {issue.severity === 'error' ? 'Error' : 'Warning'}: {issue.field}
    </span>
  ));
}

export function ImportedDataCenter() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [transportCompanies, setTransportCompanies] = useState([]);
  const [clientCompanies, setClientCompanies] = useState([]);
  const [plants, setPlants] = useState([]);
  const [owners, setOwners] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyRowId, setBusyRowId] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const filteredPlants = useMemo(() => {
    if (!filters.clientCompanyId) return plants;
    return plants.filter((plant) => plant.clientCompanyId?._id === filters.clientCompanyId || plant.clientCompanyId === filters.clientCompanyId);
  }, [filters.clientCompanyId, plants]);

  useEffect(() => {
    async function loadMasters() {
      try {
        const [transportRes, clientRes, plantRes, ownerRes] = await Promise.all([
          listTransportCompanies(token, { limit: 100 }),
          listClientCompanies(token, { limit: 100 }),
          listPlants(token, { limit: 100 }),
          listOwnersApi(token, { limit: 1000, status: 'active' })
        ]);
        setTransportCompanies(transportRes.items || []);
        setClientCompanies(clientRes.items || []);
        setPlants(plantRes.items || []);
        setOwners(ownerRes.items || []);
      } catch (err) {
        setError('Failed to load master options: ' + err.message);
      }
    }
    loadMasters();
  }, [token]);

  useEffect(() => {
    async function loadRows() {
      setLoading(true);
      setError('');
      try {
        const query = new URLSearchParams({ ...filters, page: String(filters.page), limit: String(filters.limit) }).toString();
        const response = await fetch(`${API_BASE_URL}/api/imported-data?${query}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load imported data');
        const data = await response.json();
        setRows(data.items || []);
        setSelectedRowIds([]);
        setPagination(data.pagination || { page: 1, limit: 100, total: 0, pages: 0 });
      } catch (err) {
        setError(err.message || 'Failed to load imported data');
      } finally {
        setLoading(false);
      }
    }
    loadRows();
  }, [filters, token]);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value, page: 1 }));
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function toggleSelection(rowId) {
    setSelectedRowIds((current) => (current.includes(rowId) ? current.filter((id) => id !== rowId) : [...current, rowId]));
  }

  function toggleSelectAll() {
    if (selectedRowIds.length === rows.length) {
      setSelectedRowIds([]);
      return;
    }
    setSelectedRowIds(rows.map((row) => row._id));
  }

  async function handleRowAction(row, action) {
    if (!row.importSessionId) return;
    setBusyRowId(row._id);
    try {
      if (action === 'approve') {
        await approveImportRow(row.importSessionId, row._id, token);
      } else if (action === 'reject') {
        await rejectImportRow(row.importSessionId, row._id, token);
      } else if (action === 'delete') {
        await deleteImportRow(row.importSessionId, row._id, token);
      }
      setFilters((current) => ({ ...current, page: 1 }));
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusyRowId('');
    }
  }

  async function handleBulkAction(action) {
    const selectedRows = rows.filter((row) => selectedRowIds.includes(row._id));
    if (!selectedRows.length) {
      setError('Select at least one row before applying an action.');
      return;
    }

    setBusyRowId('bulk');
    try {
      for (const row of selectedRows) {
        if (!row.importSessionId) continue;
        if (action === 'approve') {
          await approveImportRow(row.importSessionId, row._id, token);
        } else if (action === 'reject') {
          await rejectImportRow(row.importSessionId, row._id, token);
        } else if (action === 'delete') {
          await deleteImportRow(row.importSessionId, row._id, token);
        }
      }
      setSelectedRowIds([]);
      setFilters((current) => ({ ...current, page: 1 }));
    } catch (err) {
      setError(err.message || 'Bulk action failed');
    } finally {
      setBusyRowId('');
    }
  }

  function openEditModal(row) {
    setEditingRow(row);
    setEditForm({
      ...row.normalizedRow,
      invDate: formatDateValue(row.normalizedRow?.invDate),
      billDate: formatDateValue(row.normalizedRow?.billDate)
    });
  }

  function closeEditModal() {
    setEditingRow(null);
    setEditForm({});
  }

  async function saveEdit() {
    if (!editingRow?.importSessionId) return;
    setSavingEdit(true);
    setError('');
    try {
      await updateImportRow(editingRow.importSessionId, editingRow._id, { normalizedRow: editForm }, token);
      closeEditModal();
      setFilters((current) => ({ ...current, page: 1 }));
    } catch (err) {
      setError(err.message || 'Failed to update row');
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <section className="panel-surface imported-data-center">
      <div className="section-header compact">
        <div>
          <p className="eyebrow">Data operations</p>
          <h3>Imported Data Center</h3>
          <p>Review imported rows, apply approvals, and refine values while preserving the existing workflow.</p>
        </div>
        <div className="summary-pill">{rows.length} visible rows</div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <DataCenterFilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        onApply={() => setFilters((current) => ({ ...current, page: 1 }))}
        onReset={resetFilters}
        transportCompanies={transportCompanies}
        clientCompanies={clientCompanies}
        plants={plants}
        owners={owners}
        filteredPlants={filteredPlants}
        onClientCompanyChange={(event) => setFilters((current) => ({ ...current, clientCompanyId: event.target.value, plantId: '', page: 1 }))}
      />

      <DataTableToolbar
        allVisibleSelected={rows.length > 0 && selectedRowIds.length === rows.length}
        onToggleSelectAll={toggleSelectAll}
        selectedCount={selectedRowIds.length}
        onApproveSelected={() => handleBulkAction('approve')}
        onRejectSelected={() => handleBulkAction('reject')}
        onDeleteSelected={() => handleBulkAction('delete')}
        busy={busyRowId === 'bulk'}
      />

      {loading ? (
        <div className="table-placeholder">Loading imported rows…</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <h4>No imported rows found</h4>
          <p>Adjust the filters or upload a new workbook to populate this view.</p>
        </div>
      ) : (
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Invoice</th>
                <th>Inv Date</th>
                <th>GR/RR</th>
                <th>DI</th>
                <th>Party</th>
                <th>Destination</th>
                <th>Product</th>
                <th>Truck</th>
                <th>Owner</th>
                <th>PAN</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Freight</th>
                <th>Bill No</th>
                <th>Bill Date</th>
                <th>RFID</th>
                <th>GPS</th>
                <th>Diesel Ltr</th>
                <th>Diesel Amt</th>
                <th>Advance</th>
                <th>Urea</th>
                <th>Shortage</th>
                <th>Status</th>
                <th>Issues</th>
                <th>Client</th>
                <th>Plant</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className={selectedRowIds.includes(row._id) ? 'selected-row' : ''}>
                  <td><input type="checkbox" checked={selectedRowIds.includes(row._id)} onChange={() => toggleSelection(row._id)} /></td>
                  <td>{row.normalizedRow?.invNo || '-'}</td>
                  <td>{row.normalizedRow?.invDate ? String(row.normalizedRow.invDate).slice(0, 10) : '-'}</td>
                  <td>{row.normalizedRow?.grRrNo || '-'}</td>
                  <td>{row.normalizedRow?.diNo || '-'}</td>
                  <td>{row.normalizedRow?.partyName || '-'}</td>
                  <td>{row.normalizedRow?.destination || '-'}</td>
                  <td>{row.normalizedRow?.productName || '-'}</td>
                  <td>{row.normalizedRow?.truckNo || '-'}</td>
                  <td>{row.normalizedRow?.truckOwnerName || '-'}</td>
                  <td>{row.normalizedRow?.panNo || '-'}</td>
                  <td>{row.normalizedRow?.qty ?? '-'}</td>
                  <td>{row.normalizedRow?.frtPmt ?? '-'}</td>
                  <td>{row.normalizedRow?.frtAmt ?? '-'}</td>
                  <td>{row.normalizedRow?.billNo || '-'}</td>
                  <td>{row.normalizedRow?.billDate ? String(row.normalizedRow.billDate).slice(0, 10) : '-'}</td>
                  <td>{row.normalizedRow?.rfidTag ?? '-'}</td>
                  <td>{row.normalizedRow?.gpsInstall ?? '-'}</td>
                  <td>{row.normalizedRow?.lessDieselLtr ?? '-'}</td>
                  <td>{row.normalizedRow?.dieselAmount ?? '-'}</td>
                  <td>{row.normalizedRow?.lessAdvance ?? '-'}</td>
                  <td>{row.normalizedRow?.urea ?? '-'}</td>
                  <td>{row.normalizedRow?.bagShortage ?? '-'}</td>
                  <td><span className={getStatusClass(row.approvalStatus || 'pending')}>{row.approvalStatus || 'pending'}</span></td>
                  <td>
                    {getIssueSummary(row) ? (
                      <div className="issue-stack">{getIssueSummary(row)}</div>
                    ) : (
                      <span className="pill neutral">No issues</span>
                    )}
                  </td>
                  <td>{row.clientCompanyId?.companyName || '-'}</td>
                  <td>{row.plantId?.plantName || '-'}</td>
                  <td>
                    <div className="action-group">
                      <button type="button" disabled={busyRowId === row._id} onClick={() => openEditModal(row)}>Edit</button>
                      <button type="button" disabled={busyRowId === row._id} onClick={() => handleRowAction(row, 'approve')}>Approve</button>
                      <button type="button" className="secondary" disabled={busyRowId === row._id} onClick={() => handleRowAction(row, 'reject')}>Reject</button>
                      <button type="button" className="secondary danger" disabled={busyRowId === row._id} onClick={() => handleRowAction(row, 'delete')}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="table-actions">
        <span>Page {pagination.page} of {pagination.pages || 1}</span>
        <div className="action-row">
          <button type="button" disabled={pagination.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Previous</button>
          <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Next</button>
        </div>
      </div>

      {editingRow && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="section-header compact">
              <div>
                <p className="eyebrow">Edit row</p>
                <h4>Edit Imported Row</h4>
              </div>
              <button type="button" className="secondary" onClick={closeEditModal}>Close</button>
            </div>
            <div className="filter-grid modal-grid">
              {IMPORT_ROW_FIELDS.map((field) => (
                <label key={field.key} className="field-shell">
                  <span>{field.label}</span>
                  {field.type === 'date' ? (
                    <input type="date" value={editForm[field.key] || ''} onChange={(event) => setEditForm((current) => ({ ...current, [field.key]: event.target.value }))} />
                  ) : field.type === 'number' ? (
                    <input type="number" value={editForm[field.key] ?? ''} onChange={(event) => setEditForm((current) => ({ ...current, [field.key]: event.target.value }))} />
                  ) : (
                    <input type="text" value={editForm[field.key] ?? ''} onChange={(event) => setEditForm((current) => ({ ...current, [field.key]: event.target.value }))} />
                  )}
                </label>
              ))}
            </div>
            <div className="table-actions">
              <button type="button" onClick={saveEdit} disabled={savingEdit}>Save</button>
              <button type="button" className="secondary" onClick={closeEditModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
