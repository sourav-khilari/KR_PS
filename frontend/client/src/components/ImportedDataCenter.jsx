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
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
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

  function getSortableValue(row, columnKey) {
    const normalized = row?.normalizedRow || {};
    switch (columnKey) {
      case 'serial':
        return row?.sourceRowNumber ?? row?.rowNumber ?? 0;
      case 'invoice':
        return normalized.invNo || '';
      case 'invoiceDate':
        return normalized.invDate ? new Date(normalized.invDate).getTime() : 0;
      case 'grRr':
        return normalized.grRrNo || '';
      case 'di':
        return normalized.diNo || '';
      case 'party':
        return normalized.partyName || '';
      case 'destination':
        return normalized.destination || '';
      case 'product':
        return normalized.productName || '';
      case 'truck':
        return normalized.truckNo || '';
      case 'owner':
        return normalized.truckOwnerName || '';
      case 'pan':
        return normalized.panNo || '';
      case 'qty':
        return Number(normalized.qty || 0);
      case 'rate':
        return Number(normalized.frtPmt || 0);
      case 'freight':
        return Number(normalized.frtAmt || 0);
      case 'billNo':
        return normalized.billNo || '';
      case 'billDate':
        return normalized.billDate ? new Date(normalized.billDate).getTime() : 0;
      case 'rfid':
        return Number(normalized.rfidTag || 0);
      case 'gps':
        return Number(normalized.gpsInstall || 0);
      case 'dieselLtr':
        return Number(normalized.lessDieselLtr || 0);
      case 'dieselAmt':
        return Number(normalized.dieselAmount || 0);
      case 'advance':
        return Number(normalized.lessAdvance || 0);
      case 'urea':
        return Number(normalized.urea || 0);
      case 'shortage':
        return Number(normalized.bagShortage || 0);
      case 'status':
        return row?.approvalStatus || 'pending';
      case 'client':
        return row?.clientCompanyId?.companyName || '';
      case 'plant':
        return row?.plantId?.plantName || '';
      default:
        return row?.[columnKey] || '';
    }
  }

  const displayedRows = useMemo(() => {
    const sortKey = sortConfig.key;
    const direction = sortConfig.direction === 'desc' ? -1 : 1;
    return [...rows].sort((left, right) => {
      const a = getSortableValue(left, sortKey);
      const b = getSortableValue(right, sortKey);
      if (typeof a === 'number' && typeof b === 'number') {
        return (a - b) * direction;
      }
      return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }) * direction;
    });
  }, [rows, sortConfig]);

  const summaryStats = useMemo(() => {
    const total = rows.length;
    const approved = rows.filter((row) => row.approvalStatus === 'approved').length;
    const warnings = rows.filter((row) => (row.validationMessages || []).some((item) => item.severity === 'warning')).length;
    const errors = rows.filter((row) => (row.validationMessages || []).some((item) => item.severity === 'error')).length;
    const duplicates = rows.filter((row) => (row.validationMessages || []).some((item) => /duplicate|already exists/i.test(item.message || ''))).length;
    return { total, approved, warnings, errors, duplicates };
  }, [rows]);

  const warningSummary = useMemo(() => {
    const grouped = new Map();

    rows.forEach((row) => {
      const rowNumber = row?.sourceRowNumber || row?.rowNumber || 'n/a';
      (row.validationMessages || []).forEach((message) => {
        if (message.severity !== 'warning') return;

        const key = message.message || message.field || 'warning';
        const existing = grouped.get(key) || {
          message: message.message || 'Warning',
          field: message.field,
          rows: []
        };

        if (!existing.rows.includes(rowNumber)) {
          existing.rows.push(rowNumber);
        }

        grouped.set(key, existing);
      });
    });

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        rows: [...item.rows].sort((left, right) => Number(left || 0) - Number(right || 0))
      }))
      .sort((left, right) => left.message.localeCompare(right.message));
  }, [rows]);

  const ownerRowSummary = useMemo(() => {
    const grouped = new Map();

    rows.forEach((row) => {
      const ownerName = row.normalizedRow?.truckOwnerName || row.truckOwnerName || 'Unassigned';
      const existing = grouped.get(ownerName) || { ownerName, rowCount: 0, rows: [] };
      existing.rowCount += 1;
      existing.rows.push(row?.sourceRowNumber || row?.rowNumber || 'n/a');
      grouped.set(ownerName, existing);
    });

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        rows: [...item.rows].sort((left, right) => Number(left || 0) - Number(right || 0))
      }))
      .sort((left, right) => left.ownerName.localeCompare(right.ownerName));
  }, [rows]);

  function handleSort(columnKey) {
    setSortConfig((current) => ({
      key: columnKey,
      direction: current.key === columnKey && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  }

  function renderSortIndicator(columnKey) {
    if (sortConfig.key !== columnKey) return <span className="sort-indicator">↕</span>;
    return <span className="sort-indicator active">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  }

  // Sticky column left offsets (in px) computed from visible column order.
  // Important: do not hardcode offsets in CSS; offsets must adapt when visible columns change.
  const STICKY_WIDTHS = useMemo(() => ({
    select: 48,
    serial: 48,
    truck: 84, // used only when truck column exists
    actions: 320
  }), []);

  const stickyLeftByKey = useMemo(() => {
    let left = 0;
    const map = {};
    for (const col of visibleColumnDefs) {
      if (col.key === 'select' || col.key === 'serial' || col.key === 'truck' || col.key === 'actions') {
        map[col.key] = left;
        left += STICKY_WIDTHS[col.key] ?? 0;
      }
    }
    return map;
  }, [visibleColumnDefs, STICKY_WIDTHS]);

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
        return <input type="checkbox" checked={selectedRowIds.includes(row._id)} onClick={(event) => event.stopPropagation()} onChange={() => toggleSelection(row._id)} />;
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
            <button type="button" disabled={busyRowId === row._id} onClick={(event) => { event.stopPropagation(); openEditModal(row); }}>Edit</button>
            <button type="button" disabled={busyRowId === row._id} onClick={(event) => { event.stopPropagation(); handleRowAction(row, 'approve'); }}>Approve</button>
            <button type="button" className="secondary" disabled={busyRowId === row._id} onClick={(event) => { event.stopPropagation(); handleRowAction(row, 'reject'); }}>Reject</button>
            <button type="button" className="secondary danger" disabled={busyRowId === row._id} onClick={(event) => { event.stopPropagation(); handleRowAction(row, 'delete'); }}>Delete</button>
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

  function toggleSelectAll() {
    if (selectedRowIds.length === displayedRows.length) {
      setSelectedRowIds([]);
      return;
    }
    setSelectedRowIds(displayedRows.map((row) => row._id));
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
    const selectedRows = displayedRows.filter((row) => selectedRowIds.includes(row._id));
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
    <section className="panel-surface imported-data-center imported-data-shell">
      <header className="page-hero data-center-hero">
        <div>
          <p className="eyebrow">Data operations</p>
          <h3>Imported Data Center</h3>
          <p className="muted-copy">Browse imported rows in a wide, table-first workspace with filters, summaries, and a single-row drawer.</p>
        </div>
        <div className="hero-chip-stack">
          <span className="summary-pill">{summaryStats.total} imported</span>
          <span className="summary-pill">{summaryStats.approved} approved</span>
        </div>
      </header>

      <div className="imported-data-center__summary imported-data-center__summary--wide">
        <div className="metric-card">
          <span>Imported Rows</span>
          <strong>{summaryStats.total}</strong>
        </div>
        <div className="metric-card">
          <span>Approved</span>
          <strong>{summaryStats.approved}</strong>
        </div>
        <div className="metric-card">
          <span>Warnings</span>
          <strong>{summaryStats.warnings}</strong>
        </div>
        <div className="metric-card">
          <span>Errors</span>
          <strong>{summaryStats.errors}</strong>
        </div>
        <div className="metric-card">
          <span>Duplicates</span>
          <strong>{summaryStats.duplicates}</strong>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <section className="panel-surface warning-summary-panel">
        <div className="section-header compact">
          <div>
            <p className="eyebrow">Preview insights</p>
            <h3>Unique warnings and owner row counts</h3>
          </div>
          <span className="summary-pill">{warningSummary.length} warning group{warningSummary.length === 1 ? '' : 's'}</span>
        </div>
        <div className="warning-summary-grid">
          <div className="warning-summary-item">
            <div className="warning-summary-header">
              <span className="pill warning">Warnings</span>
              <span className="pill neutral">{warningSummary.length}</span>
            </div>
            {warningSummary.length ? (
              <ul className="message-list">
                {warningSummary.map((item) => (
                  <li key={`${item.field || 'warning'}-${item.message}`} title={`Rows: ${item.rows.join(', ')}`}>
                    <span className="pill warning">{item.message}</span>
                    <span className="warning-summary-rows">Rows: {item.rows.join(', ')}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="table-placeholder">No warning issues are present in the current data set.</p>
            )}
          </div>
          <div className="warning-summary-item">
            <div className="warning-summary-header">
              <span className="pill neutral">Owners</span>
              <span className="pill neutral">{ownerRowSummary.length}</span>
            </div>
            {ownerRowSummary.length ? (
              <ul className="message-list">
                {ownerRowSummary.map((item) => (
                  <li key={item.ownerName} title={`${item.rowCount} rows`}>
                    <span className="pill neutral">{item.ownerName}</span>
                    <span className="warning-summary-rows">{item.rowCount} row{item.rowCount === 1 ? '' : 's'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="table-placeholder">No owner row counts available yet.</p>
            )}
          </div>
        </div>
      </section>

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

      <div className="toolbar-shell toolbar-shell--compact">
        <DataTableToolbar
          allVisibleSelected={displayedRows.length > 0 && selectedRowIds.length === displayedRows.length}
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

      <div className="table-shell imported-table-shell">
        {loading ? (
          <div className="table-placeholder">Loading imported rows…</div>
        ) : displayedRows.length === 0 ? (
          <div className="empty-state">
            <h4>No imported rows found</h4>
            <p>Adjust the filters or upload a new workbook to populate this view.</p>
          </div>
        ) : (
          <table className="data-table imported-data-table">
            <thead>
              <tr>
                {visibleColumnDefs.map((column) => (
                  <th
                    key={column.key}
                    className={
                      column.key === 'select'
                        ? 'sticky-col sticky-col-select'
                        : column.key === 'serial'
                          ? 'sticky-col sticky-col-serial'
                          : column.key === 'truck'
                            ? 'sticky-col sticky-col-truck'
                            : column.key === 'actions'
                              ? 'sticky-col sticky-col-actions'
                              : ''
                    }
                    style={column.key === 'select' || column.key === 'serial' || column.key === 'truck' || column.key === 'actions' ? { '--sticky-left': `${stickyLeftByKey[column.key] ?? 0}px` } : undefined}
                  >
                    <button type="button" className="table-sort-btn" onClick={() => handleSort(column.key)}>
                      <span>{column.label}</span>
                      {renderSortIndicator(column.key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedRows.map((row, index) => (
                <tr key={row._id} className={selectedRowIds.includes(row._id) ? 'selected-row' : ''} onClick={() => openEditModal(row)}>
                  {visibleColumnDefs.map((column) => (
                    <td
                      key={column.key}
                      className={
                        column.key === 'select'
                          ? 'sticky-col sticky-col-select'
                          : column.key === 'serial'
                            ? 'sticky-col sticky-col-serial'
                            : column.key === 'truck'
                              ? 'sticky-col sticky-col-truck'
                              : column.key === 'actions'
                                ? 'sticky-col sticky-col-actions'
                                : ''
                      }
                      style={column.key === 'select' || column.key === 'serial' || column.key === 'truck' || column.key === 'actions' ? { '--sticky-left': `${stickyLeftByKey[column.key] ?? 0}px` } : undefined}
                      onClick={column.key === 'actions' ? (event) => event.stopPropagation() : undefined}
                    >
                      {renderCellValue(column, row, index)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="table-actions pagination-shell">
        <span>Page {pagination.page} of {pagination.pages || 1}</span>
        <div className="action-row">
          <button type="button" disabled={pagination.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Previous</button>
          <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Next</button>
        </div>
      </div>

      {editingRow && (
        <div className="modal-backdrop drawer-backdrop" onClick={closeEditModal}>
          <aside className="drawer-panel data-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <p className="eyebrow">Row details</p>
                <h4>{editingRow.normalizedRow?.invNo || 'Imported row'}</h4>
                <p className="muted-copy">{editingRow.normalizedRow?.truckNo || '-'} • {editingRow.normalizedRow?.truckOwnerName || '-'}</p>
              </div>
              <button type="button" className="secondary" onClick={closeEditModal}>Close</button>
            </div>

            <div className="drawer-content">
              <section className="drawer-card-section">
                <h5>General Information</h5>
                <div className="drawer-info-grid">
                  <div><span>Sheet</span><strong>{editingRow.sourceSheetName || editingRow.sheetName || '-'}</strong></div>
                  <div><span>Row</span><strong>{editingRow.sourceRowNumber || editingRow.rowNumber || '-'}</strong></div>
                  <div><span>Status</span><strong className={`status-pill ${editingRow.approvalStatus || 'pending'}`}>{editingRow.approvalStatus || 'pending'}</strong></div>
                  <div><span>Issues</span><strong>{(editingRow.validationMessages || []).length}</strong></div>
                </div>
              </section>

              <section className="drawer-card-section">
                <h5>Truck Information</h5>
                <div className="drawer-info-grid">
                  <div><span>Truck No</span><strong>{editingRow.normalizedRow?.truckNo || '-'}</strong></div>
                  <div><span>Destination</span><strong>{editingRow.normalizedRow?.destination || '-'}</strong></div>
                  <div><span>Product</span><strong>{editingRow.normalizedRow?.productName || '-'}</strong></div>
                  <div><span>Invoice Date</span><strong>{formatDateValue(editingRow.normalizedRow?.invDate) || '-'}</strong></div>
                </div>
              </section>

              <section className="drawer-card-section">
                <h5>Owner Information</h5>
                <div className="drawer-info-grid">
                  <div><span>Owner Name</span><strong>{editingRow.normalizedRow?.truckOwnerName || '-'}</strong></div>
                  <div><span>PAN</span><strong>{editingRow.normalizedRow?.panNo || '-'}</strong></div>
                  <div><span>Transport Company</span><strong>{editingRow.transportCompanyId?.companyName || '-'}</strong></div>
                  <div><span>Client Company</span><strong>{editingRow.clientCompanyId?.companyName || '-'}</strong></div>
                </div>
              </section>

              <section className="drawer-card-section">
                <h5>Payment Information</h5>
                <div className="drawer-info-grid">
                  <div><span>Qty</span><strong>{editingRow.normalizedRow?.qty ?? '-'}</strong></div>
                  <div><span>Rate</span><strong>{editingRow.normalizedRow?.frtPmt ?? '-'}</strong></div>
                  <div><span>Freight Amount</span><strong>{editingRow.normalizedRow?.frtAmt ?? '-'}</strong></div>
                  <div><span>Diesel Amount</span><strong>{editingRow.normalizedRow?.dieselAmount ?? '-'}</strong></div>
                  <div><span>Advance</span><strong>{editingRow.normalizedRow?.lessAdvance ?? '-'}</strong></div>
                  <div><span>Shortage</span><strong>{editingRow.normalizedRow?.bagShortage ?? '-'}</strong></div>
                </div>
              </section>

              <section className="drawer-card-section">
                <h5>Validation</h5>
                {editingRow.validationMessages?.length ? (
                  <div className="drawer-validation-list">
                    {editingRow.validationMessages.map((item, index) => (
                      <div key={`${item.field}-${index}`} className={`drawer-validation-item ${item.severity}`}>
                        <strong>{item.severity.toUpperCase()}</strong>
                        <span>{item.field}</span>
                        <p>{item.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state compact">No validation issues found.</div>
                )}
              </section>

              <section className="drawer-card-section">
                <h5>Raw Imported Values</h5>
                <div className="raw-values-grid">
                  {Object.entries(editingRow.rawRow || {}).slice(0, 12).map(([key, value]) => (
                    <div key={key} className="raw-value-item">
                      <span>{key}</span>
                      <strong>{String(value ?? '-')}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="drawer-card-section">
                <h5>Editable Fields</h5>
                <div className="drawer-edit-grid">
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
              </section>
            </div>

            <div className="drawer-footer">
              <div className="action-row">
                <button type="button" onClick={() => handleRowAction(editingRow, 'approve')} disabled={busyRowId === editingRow._id}>Approve</button>
                <button type="button" className="secondary" onClick={() => handleRowAction(editingRow, 'reject')} disabled={busyRowId === editingRow._id}>Reject</button>
                <button type="button" className="secondary danger" onClick={() => handleRowAction(editingRow, 'delete')} disabled={busyRowId === editingRow._id}>Delete</button>
              </div>
              <div className="action-row">
                <button type="button" onClick={saveEdit} disabled={savingEdit}>Save</button>
                <button type="button" className="secondary" onClick={closeEditModal}>Cancel</button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
