import { useEffect, useState } from 'react';
import { listOwnersApi, updateOwnerApi, createOwnerApi, deleteOwnerApi } from '../../services/api.js';
import { OwnerEditDrawer } from './OwnerEditDrawer.jsx';

export function OwnerMasterPage({ token, selectedOwnerFromDashboard, onDrawerClosed }) {
  const [owners, setOwners] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ q: '', status: '' });
  const [activeFilters, setActiveFilters] = useState({ q: '', status: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentOwner, setCurrentOwner] = useState(null);

  async function loadOwners(page = 1) {
    setIsLoading(true);
    setError('');
    try {
      const result = await listOwnersApi(token, {
        page,
        limit: 10,
        q: activeFilters.q,
        status: activeFilters.status
      });
      setOwners(result.items || []);
      setPagination(result.pagination || { page, pages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load owners');
    } finally {
      setIsLoading(false);
    }
  }

  // Reload when active filters or page changes
  useEffect(() => {
    loadOwners(1);
  }, [activeFilters]);

  // Handle direct navigation from dashboard warning triggers
  useEffect(() => {
    if (selectedOwnerFromDashboard) {
      setCurrentOwner(selectedOwnerFromDashboard);
      setIsDrawerOpen(true);
    }
  }, [selectedOwnerFromDashboard]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setActiveFilters({ ...filters });
  }

  function handleOpenCreate() {
    setCurrentOwner(null);
    setIsDrawerOpen(true);
  }

  function handleOpenEdit(owner) {
    setCurrentOwner(owner);
    setIsDrawerOpen(true);
  }

  async function handleSaveOwner(formData) {
    setError('');
    setSuccessMessage('');
    try {
      if (currentOwner?._id) {
        await updateOwnerApi(currentOwner._id, formData, token);
        setSuccessMessage('Owner details updated successfully');
      } else {
        await createOwnerApi(formData, token);
        setSuccessMessage('New owner created successfully');
      }
      loadOwners(pagination.page);
    } catch (err) {
      throw new Error(err.message || 'Failed to save owner data');
    }
  }

  async function handleDeleteOwner(owner) {
    if (!window.confirm(`Are you sure you want to make owner "${owner.ownerName}" inactive?`)) {
      return;
    }
    setError('');
    setSuccessMessage('');
    try {
      await deleteOwnerApi(owner._id, token);
      setSuccessMessage(`Owner "${owner.ownerName}" has been made inactive`);
      loadOwners(pagination.page);
    } catch (err) {
      setError(err.message || 'Failed to update owner status');
    }
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false);
    setCurrentOwner(null);
    if (onDrawerClosed) onDrawerClosed();
  }

  return (
    <div className="owner-master-page">
      <div className="master-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Owner Management</h2>
          <p>Register truck owners, configure PAN, tax deduction rates (TDS), and commission modes.</p>
        </div>
        <button type="button" className="action-btn" onClick={handleOpenCreate}>
          + Add Owner
        </button>
      </div>

      {successMessage && <div className="alert success">{successMessage}</div>}
      {error && <div className="alert error">{error}</div>}

      <form className="master-toolbar" onSubmit={handleSearchSubmit}>
        <input
          placeholder="Search by name or PAN..."
          value={filters.q}
          onChange={e => setFilters(prev => ({ ...prev, q: e.target.value }))}
          style={{ width: '260px' }}
        />
        <select
          value={filters.status}
          onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        <button type="submit" className="action-btn secondary">Search</button>
      </form>

      {isLoading ? (
        <div className="empty-cell">Loading owners master data...</div>
      ) : owners.length === 0 ? (
        <div className="empty-cell">No owners found. Adjust filters or create a new owner.</div>
      ) : (
        <>
          <div className="master-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Owner Name</th>
                  <th>PAN Number</th>
                  <th>TDS Rate</th>
                  <th>Commission Rule</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {owners.map(owner => {
                  const commTypeDesc = owner.commissionType === 'fixed' ? 'Fixed (INR)'
                    : owner.commissionType === 'percentage' ? 'Percentage (%)'
                    : 'Truck-wise';
                  
                  const commValDesc = owner.commissionType === 'truck_wise' 
                    ? `${Object.keys(owner.truckWiseCommissionMap || {}).length} mapped` 
                    : owner.commissionValue;

                  return (
                    <tr key={owner._id}>
                      <td style={{ fontWeight: 'bold', color: '#f8fafc' }}>{owner.ownerName}</td>
                      <td>
                        {owner.panNumber ? (
                          <span className="badge info">{owner.panNumber}</span>
                        ) : (
                          <span className="badge danger">Missing PAN</span>
                        )}
                      </td>
                      <td>{owner.tdsPercentage ?? 0}%</td>
                      <td>
                        <span style={{ fontSize: '13px' }}>
                          {commTypeDesc} : <strong>{commValDesc}</strong>
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${owner.status === 'active' ? 'success' : 'danger'}`}>
                          {owner.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {owner.remarks || '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="action-btn secondary"
                          style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }}
                          onClick={() => handleOpenEdit(owner)}
                        >
                          Edit
                        </button>
                        {owner.status === 'active' && (
                          <button
                            type="button"
                            className="action-btn danger"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => handleDeleteOwner(owner)}
                          >
                            Disable
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>
              Showing {owners.length} owners (Total: {pagination.total})
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="action-btn secondary"
                disabled={pagination.page <= 1}
                onClick={() => loadOwners(pagination.page - 1)}
                style={{ padding: '6px 12px' }}
              >
                Prev
              </button>
              <span>Page {pagination.page} of {pagination.pages}</span>
              <button
                type="button"
                className="action-btn secondary"
                disabled={pagination.page >= pagination.pages}
                onClick={() => loadOwners(pagination.page + 1)}
                style={{ padding: '6px 12px' }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {isDrawerOpen && (
        <OwnerEditDrawer
          owner={currentOwner}
          onClose={handleCloseDrawer}
          onSave={handleSaveOwner}
          token={token}
        />
      )}
    </div>
  );
}
