import { useEffect, useState } from 'react';
import {
  listCommissionRulesApi,
  createCommissionRuleApi,
  updateCommissionRuleApi,
  deleteCommissionRuleApi
} from '../../services/api.js';
import { CommissionRuleEditDrawer } from './CommissionRuleEditDrawer.jsx';

export function CommissionRulePage({ token }) {
  const [rules, setRules] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ q: '', status: '' });
  const [activeFilters, setActiveFilters] = useState({ q: '', status: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState(null);

  async function loadRules(page = 1) {
    setIsLoading(true);
    setError('');
    try {
      const result = await listCommissionRulesApi(token, {
        page,
        limit: 10,
        q: activeFilters.q,
        status: activeFilters.status
      });
      setRules(result.items || []);
      setPagination(result.pagination || { page, pages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load commission rules');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRules(1);
  }, [activeFilters]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setActiveFilters({ ...filters });
  }

  function handleOpenCreate() {
    setCurrentRule(null);
    setIsDrawerOpen(true);
  }

  function handleOpenEdit(rule) {
    setCurrentRule(rule);
    setIsDrawerOpen(true);
  }

  async function handleSaveRule(formData) {
    setError('');
    setSuccessMessage('');
    try {
      if (currentRule?._id) {
        await updateCommissionRuleApi(currentRule._id, formData, token);
        setSuccessMessage('Commission rule updated successfully');
      } else {
        await createCommissionRuleApi(formData, token);
        setSuccessMessage('New commission rule created successfully');
      }
      loadRules(pagination.page);
    } catch (err) {
      throw new Error(err.message || 'Failed to save commission rule');
    }
  }

  async function handleDeleteRule(rule) {
    if (!window.confirm('Are you sure you want to delete this commission rule?')) {
      return;
    }
    setError('');
    setSuccessMessage('');
    try {
      await deleteCommissionRuleApi(rule._id, token);
      setSuccessMessage('Commission rule deleted successfully');
      loadRules(pagination.page);
    } catch (err) {
      setError(err.message || 'Failed to delete commission rule');
    }
  }

  return (
    <div className="owner-master-container">
      <div className="master-header">
        <h2>Commission Rules Master</h2>
        <button
          type="button"
          className="btn primary-btn add-btn"
          onClick={handleOpenCreate}
        >
          + Add New Rule
        </button>
      </div>

      {successMessage && <div className="alert success">{successMessage}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="filter-row">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            placeholder="Search by truck number or remarks..."
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            className="search-input"
          />
          <button type="submit" className="btn secondary-btn search-btn">
            Search
          </button>
        </form>

        <div className="status-filter">
          <label htmlFor="status-select">Status:</label>
          <select
            id="status-select"
            value={filters.status}
            onChange={(e) => {
              const newFilters = { ...filters, status: e.target.value };
              setFilters(newFilters);
              setActiveFilters(newFilters);
            }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-spinner">Loading commission rules...</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Owner</th>
                <th>Transport Company</th>
                <th>Client Company</th>
                <th>Plant</th>
                <th>Truck</th>
                <th>Type</th>
                <th>Value</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule._id} className={rule.status === 'inactive' ? 'row-inactive' : ''}>
                  <td className="strong">{rule.ownerId?.ownerName || 'N/A'}</td>
                  <td>{rule.transportCompanyId?.companyName || 'N/A'}</td>
                  <td>{rule.clientCompanyId?.companyName || 'N/A'}</td>
                  <td>{rule.plantId?.plantName || 'N/A'}</td>
                  <td className="mono">{rule.truckNumber || 'All Trucks'}</td>
                  <td className="capitalize">{rule.commissionType}</td>
                  <td className="strong">
                    {rule.commissionType === 'percentage' 
                      ? `${rule.commissionValue}%`
                      : `₹${rule.commissionValue}`}
                  </td>
                  <td>
                    <span className={`badge ${rule.status === 'active' ? 'approved' : 'rejected'}`}>
                      {rule.status}
                    </span>
                  </td>
                  <td className="remarks-cell">{rule.remarks || '-'}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="btn text-btn edit-btn"
                        onClick={() => handleOpenEdit(rule)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn text-btn delete-btn"
                        onClick={() => handleDeleteRule(rule)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan="10" className="empty-cell">
                    No commission rules found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                type="button"
                disabled={pagination.page === 1}
                onClick={() => loadRules(pagination.page - 1)}
                className="btn pagination-btn"
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>
              <button
                type="button"
                disabled={pagination.page === pagination.pages}
                onClick={() => loadRules(pagination.page + 1)}
                className="btn pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {isDrawerOpen && (
        <CommissionRuleEditDrawer
          rule={currentRule}
          onClose={() => setIsDrawerOpen(false)}
          onSave={handleSaveRule}
          token={token}
        />
      )}
    </div>
  );
}
