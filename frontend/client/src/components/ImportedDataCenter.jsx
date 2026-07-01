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

const COLUMN_DEFS = [
  { key: 'select', label: 'Select', essential: true },
  { key: 'serial', label: '#', essential: true },
  { key: 'invoice', label: 'Invoice', essential: true },
  { key: 'invoiceDate', label: 'Inv Date' },
  { key: 'grRr', label: 'GR/RR' },
  { key: 'di', label: 'DI' },
  { key: 'party', label: 'Party' },
  { key: 'destination', label: 'Destination' },
  { key: 'product', label: 'Product' },
  { key: 'truck', label: 'Truck', essential: true },
  { key: 'owner', label: 'Owner', essential: true },
  { key: 'pan', label: 'PAN' },
  { key: 'qty', label: 'Qty' },
  { key: 'rate', label: 'Rate' },
  { key: 'freight', label: 'Freight' },
  { key: 'billNo', label: 'Bill No' },
  { key: 'billDate', label: 'Bill Date' },
  { key: 'rfid', label: 'RFID' },
  { key: 'gps', label: 'GPS' },
  { key: 'dieselLtr', label: 'Diesel Ltr' },
  { key: 'dieselAmt', label: 'Diesel Amt' },
  { key: 'advance', label: 'Advance' },
  { key: 'urea', label: 'Urea' },
  { key: 'shortage', label: 'Shortage' },
  { key: 'status', label: 'Status', essential: true },
  { key: 'issues', label: 'Issues' },
  { key: 'client', label: 'Client' },
  { key: 'plant', label: 'Plant' },
  { key: 'actions', label: 'Actions', essential: true }
];

const DEFAULT_VISIBLE_COLUMNS = ['select', 'serial', 'invoice', 'truck', 'owner', 'status', 'actions'];

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
  const [visibleColumns, setVisibleColumns] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_VISIBLE_COLUMNS;
    try {
      const stored = window.localStorage.getItem('imported-data-columns');
      if (!stored) return DEFAULT_VISIBLE_COLUMNS;
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_VISIBLE_COLUMNS;
    } catch {
      return DEFAULT_VISIBLE_COLUMNS;
    }
  });

  const filteredPlants = useMemo(() => {
    if (!filters.clientCompanyId) return plants;
    return plants.filter((plant) => plant.clientCompanyId?._id === filters.clientCompanyId || plant.clientCompanyId === filters.clientCompanyId);
  }, [filters.clientCompanyId, plants]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('imported-data-columns', JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

  const visibleColumnDefs = useMemo(() => COLUMN_DEFS.filter((column) => column.essential || visibleColumns.includes(column.key)), [visibleColumns]);

  function toggleColumn(columnKey) {
    setVisibleColumns((current) => {
      if (current.includes(columnKey)) {
        return current.filter((key) => key !== columnKey);
      }
      return [...current, columnKey];
    });
  }

  function renderCellValue(column, row, index) {
    switch (column.key) {
      case 'select':
        return <input type="checkbox" checked={selectedRowIds.includes(row._id)} onChange={() => toggleSelection(row._id)} />;
      case 'serial':
        return <span className="table-cell-truncate" title={String(index + 1)}>{index + 1}</span>;
      case 'invoice':
        return <span className="table-cell-truncate" title={row.normalizedRow?.invNo || '-'}>{row.normalizedRow?.invNo || '-'}</span>;
      case 'invoiceDate':
        return <span className="table-cell-truncate" title={row.normalizedRow?.invDate ? String(row.normalizedRow.invDate).slice(0, 10) : '-'}>{row.normalizedRow?.invDate ? String(row.normalizedRow.invDate).slice(0, 10) : '-'}</span>;
      case 'grRr':
        return <span className="table-cell-truncate" title={row.normalizedRow?.grRrNo || '-'}>{row.normalizedRow?.grRrNo || '-'}</span>;
      case 'di':
        return <span className="table-cell-truncate" title={row.normalizedRow?.diNo || '-'}>{row.normalizedRow?.diNo || '-'}</span>;
      case 'party':
        return <span className="table-cell-truncate" title={row.normalizedRow?.partyName || '-'}>{row.normalizedRow?.partyName || '-'}</span>;
      case 'destination':
        return <span className="table-cell-truncate" title={row.normalizedRow?.destination || '-'}>{row.normalizedRow?.destination || '-'}</span>;
      case 'product':
        return <span className="table-cell-truncate" title={row.normalizedRow?.productName || '-'}>{row.normalizedRow?.productName || '-'}</span>;
      case 'truck':
        return <span className="table-cell-truncate" title={row.normalizedRow?.truckNo || '-'}>{row.normalizedRow?.truckNo || '-'}</span>;
      case 'owner':
        return <span className="table-cell-truncate" title={row.normalizedRow?.truckOwnerName || '-'}>{row.normalizedRow?.truckOwnerName || '-'}</span>;
      case 'pan':
        return <span className="table-cell-truncate" title={row.normalizedRow?.panNo || '-'}>{row.normalizedRow?.panNo || '-'}</span>;
      case 'qty':
        return <span className="table-cell-truncate" title={row.normalizedRow?.qty ?? '-'}>{row.normalizedRow?.qty ?? '-'}</span>;
      case 'rate':
        return <span className="table-cell-truncate" title={row.normalizedRow?.frtPmt ?? '-'}>{row.normalizedRow?.frtPmt ?? '-'}</span>;
      case 'freight':
        return <span className="table-cell-truncate" title={row.normalizedRow?.frtAmt ?? '-'}>{row.normalizedRow?.frtAmt ?? '-'}</span>;
      case 'billNo':
        return <span className="table-cell-truncate" title={row.normalizedRow?.billNo || '-'}>{row.normalizedRow?.billNo || '-'}</span>;
      case 'billDate':
        return <span className="table-cell-truncate" title={row.normalizedRow?.billDate ? String(row.normalizedRow.billDate).slice(0, 10) : '-'}>{row.normalizedRow?.billDate ? String(row.normalizedRow.billDate).slice(0, 10) : '-'}</span>;
      case 'rfid':
        return <span className="table-cell-truncate" title={row.normalizedRow?.rfidTag ?? '-'}>{row.normalizedRow?.rfidTag ?? '-'}</span>;
      case 'gps':
        return <span className="table-cell-truncate" title={row.normalizedRow?.gpsInstall ?? '-'}>{row.normalizedRow?.gpsInstall ?? '-'}</span>;
      case 'dieselLtr':
        return <span className="table-cell-truncate" title={row.normalizedRow?.lessDieselLtr ?? '-'}>{row.normalizedRow?.lessDieselLtr ?? '-'}</span>;
      case 'dieselAmt':
        return <span className="table-cell-truncate" title={row.normalizedRow?.dieselAmount ?? '-'}>{row.normalizedRow?.dieselAmount ?? '-'}</span>;
      case 'advance':
        return <span className="table-cell-truncate" title={row.normalizedRow?.lessAdvance ?? '-'}>{row.normalizedRow?.lessAdvance ?? '-'}</span>;
      case 'urea':
        return <span className="table-cell-truncate" title={row.normalizedRow?.urea ?? '-'}>{row.normalizedRow?.urea ?? '-'}</span>;
      case 'shortage':
        return <span className="table-cell-truncate" title={row.normalizedRow?.bagShortage ?? '-'}>{row.normalizedRow?.bagShortage ?? '-'}</span>;
      case 'status':
        return <span className={getStatusClass(row.approvalStatus || 'pending')}>{row.approvalStatus || 'pending'}</span>;
      case 'issues':
        return getIssueSummary(row) ? <div className="issue-stack">{getIssueSummary(row)}</div> : <span className="pill neutral">No issues</span>;
      case 'client':
        return <span className="table-cell-truncate" title={row.clientCompanyId?.companyName || '-'}>{row.clientCompanyId?.companyName || '-'}</span>;
      case 'plant':
        return <span className="table-cell-truncate" title={row.plantId?.plantName || '-'}>{row.plantId?.plantName || '-'}</span>;
      case 'actions':
        return (
          <div className="action-group">
            <button type="button" disabled={busyRowId === row._id} onClick={() => openEditModal(row)}>Edit</button>
            <button type="button" disabled={busyRowId === row._id} onClick={() => handleRowAction(row, 'approve')}>Approve</button>
            <button type="button" className="secondary" disabled={busyRowId === row._id} onClick={() => handleRowAction(row, 'reject')}>Reject</button>
            <button type="button" className="secondary danger" disabled={busyRowId === row._id} onClick={() => handleRowAction(row, 'delete')}>Delete</button>
          </div>
        );
      default:
        return <span className="table-cell-truncate" title="-">-</span>;
    }
  }

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
          <p>Review imported rows, apply approvals, and refine values while keeping the workflow intact.</p>
        </div>
        <div className="summary-pill">{rows.length} visible rows</div>
      </div>

      <div className="imported-data-center__summary">
        <div className="metric-card">
          <span>Visible rows</span>
          <strong>{rows.length}</strong>
        </div>
        <div className="metric-card">
          <span>Selected</span>
          <strong>{selectedRowIds.length}</strong>
        </div>
        <div className="metric-card">
          <span>Pages</span>
          <strong>{pagination.pages || 1}</strong>
        </div>
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

      <div className="toolbar-shell">
        <DataTableToolbar
          allVisibleSelected={rows.length > 0 && selectedRowIds.length === rows.length}
          onToggleSelectAll={toggleSelectAll}
          selectedCount={selectedRowIds.length}
          onApproveSelected={() => handleBulkAction('approve')}
          onRejectSelected={() => handleBulkAction('reject')}
          onDeleteSelected={() => handleBulkAction('delete')}
          busy={busyRowId === 'bulk'}
        />
        <details className="column-picker">
          <summary>Columns</summary>
          <div className="column-picker-menu">
            {COLUMN_DEFS.filter((column) => !column.essential).map((column) => (
              <label key={column.key} className="checkbox-pill compact-checkbox">
                <input type="checkbox" checked={visibleColumns.includes(column.key)} onChange={() => toggleColumn(column.key)} />
                <span>{column.label}</span>
              </label>
            ))}
          </div>
        </details>
      </div>

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
                {visibleColumnDefs.map((column) => (
                  <th key={column.key} className={column.key === 'serial' ? 'sticky-col sticky-col-serial' : column.key === 'truck' ? 'sticky-col sticky-col-truck' : column.key === 'actions' ? 'sticky-col sticky-col-actions' : ''}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row._id} className={selectedRowIds.includes(row._id) ? 'selected-row' : ''}>
                  {visibleColumnDefs.map((column) => (
                    <td key={column.key} className={column.key === 'select' ? 'sticky-col sticky-col-select' : column.key === 'serial' ? 'sticky-col sticky-col-serial' : column.key === 'truck' ? 'sticky-col sticky-col-truck' : column.key === 'actions' ? 'sticky-col sticky-col-actions' : ''}>
                      {renderCellValue(column, row, index)}
                    </td>
                  ))}
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
