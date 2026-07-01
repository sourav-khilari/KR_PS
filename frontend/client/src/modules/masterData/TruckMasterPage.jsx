import { useEffect, useState } from 'react';
import { listTrucksApi, updateTruckApi, createTruckApi, deleteTruckApi } from '../../services/api.js';
import { TruckEditDrawer } from './TruckEditDrawer.jsx';

export function TruckMasterPage({ token, selectedTruckFromDashboard, onDrawerClosed }) {
  const [trucks, setTrucks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ q: '', status: '', ownerId: '' });
  const [activeFilters, setActiveFilters] = useState({ q: '', status: '', ownerId: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentTruck, setCurrentTruck] = useState(null);

  async function loadTrucks(page = 1) {
    setIsLoading(true);
    setError('');
    try {
      const result = await listTrucksApi(token, {
        page,
        limit: 10,
        q: activeFilters.q,
        status: activeFilters.status,
        ownerId: activeFilters.ownerId
      });
      setTrucks(result.items || []);
      setPagination(result.pagination || { page, pages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load trucks');
    } finally {
      setIsLoading(false);
    }
  }

  // Reload when active filters or page changes
  useEffect(() => {
    loadTrucks(1);
  }, [activeFilters]);

  // Handle direct navigation from dashboard warning triggers
  useEffect(() => {
    if (selectedTruckFromDashboard) {
      setCurrentTruck(selectedTruckFromDashboard);
      setIsDrawerOpen(true);
    }
  }, [selectedTruckFromDashboard]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setActiveFilters({ ...filters });
  }

  function handleOpenCreate() {
    setCurrentTruck(null);
    setIsDrawerOpen(true);
  }

  function handleOpenEdit(truck) {
    setCurrentTruck(truck);
    setIsDrawerOpen(true);
  }

  async function handleSaveTruck(formData) {
    setError('');
    setSuccessMessage('');
    try {
      if (currentTruck?._id) {
        await updateTruckApi(currentTruck._id, formData, token);
        setSuccessMessage('Truck owner mapping updated successfully');
      } else {
        await createTruckApi(formData, token);
        setSuccessMessage('New truck mapping created successfully');
      }
      loadTrucks(pagination.page);
    } catch (err) {
      throw new Error(err.message || 'Failed to save truck mapping');
    }
  }

  async function handleDeleteTruck(truck) {
    if (!window.confirm(`Are you sure you want to make truck "${truck.truckNumber}" inactive?`)) {
      return;
    }
    setError('');
    setSuccessMessage('');
    try {
      await deleteTruckApi(truck._id, token);
      setSuccessMessage(`Truck "${truck.truckNumber}" has been made inactive`);
      loadTrucks(pagination.page);
    } catch (err) {
      setError(err.message || 'Failed to update truck status');
    }
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false);
    setCurrentTruck(null);
    if (onDrawerClosed) onDrawerClosed();
  }

  return (
    <div className="truck-master-page">
      <div className="master-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Truck Mapping & Masters</h2>
          <p>Maintain active truck numbers and map each truck to its registered payment owner.</p>
        </div>
        <button type="button" className="action-btn" onClick={handleOpenCreate}>
          + Add Truck
        </button>
      </div>

      {successMessage && <div className="alert success">{successMessage}</div>}
      {error && <div className="alert error">{error}</div>}

      <form className="master-toolbar" onSubmit={handleSearchSubmit}>
        <input
          placeholder="Search truck number or owner..."
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
        <div className="empty-cell">Loading trucks master data...</div>
      ) : trucks.length === 0 ? (
        <div className="empty-cell">No trucks found. Adjust filters or register a new truck.</div>
      ) : (
        <>
          <div className="master-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Truck Number</th>
                  <th>Normalized Number</th>
                  <th>Current Owner</th>
                  <th>PAN Number</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trucks.map(truck => {
                  const ownerName = truck.ownerId?.ownerName || 'Unmapped';
                  const panNumber = truck.ownerId?.panNumber || '-';
                  const isOwnerActive = truck.ownerId?.status === 'active';

                  return (
                    <tr key={truck._id}>
                      <td style={{ fontWeight: 'bold', color: '#f8fafc' }}>{truck.truckNumber}</td>
                      <td style={{ fontFamily: 'monospace' }}>{truck.normalizedTruckNumber}</td>
                      <td>
                        {truck.ownerId ? (
                          <span style={{ fontWeight: 500, color: isOwnerActive ? '#f8fafc' : '#94a3b8' }}>
                            {ownerName} {!isOwnerActive && <span style={{ fontSize: '11px', color: '#ef4444' }}>(Inactive)</span>}
                          </span>
                        ) : (
                          <span className="badge danger">Unmapped / Missing</span>
                        )}
                      </td>
                      <td>{panNumber}</td>
                      <td>
                        <span className={`badge ${truck.status === 'active' ? 'success' : 'danger'}`}>
                          {truck.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#94a3b8' }}>{truck.remarks || '-'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="action-btn secondary"
                          style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }}
                          onClick={() => handleOpenEdit(truck)}
                        >
                          Edit
                        </button>
                        {truck.status === 'active' && (
                          <button
                            type="button"
                            className="action-btn danger"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => handleDeleteTruck(truck)}
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
              Showing {trucks.length} trucks (Total: {pagination.total})
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="action-btn secondary"
                disabled={pagination.page <= 1}
                onClick={() => loadTrucks(pagination.page - 1)}
                style={{ padding: '6px 12px' }}
              >
                Prev
              </button>
              <span>Page {pagination.page} of {pagination.pages}</span>
              <button
                type="button"
                className="action-btn secondary"
                disabled={pagination.page >= pagination.pages}
                onClick={() => loadTrucks(pagination.page + 1)}
                style={{ padding: '6px 12px' }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {isDrawerOpen && (
        <TruckEditDrawer
          truck={currentTruck}
          onClose={handleCloseDrawer}
          onSave={handleSaveTruck}
          token={token}
        />
      )}
    </div>
  );
}
