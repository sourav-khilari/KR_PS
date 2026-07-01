import { useEffect, useState } from 'react';
import { listOwnersApi } from '../../services/api.js';

export function TruckEditDrawer({ truck, onClose, onSave, token }) {
  const [form, setForm] = useState({
    truckNumber: '',
    ownerId: '',
    status: 'active',
    remarks: ''
  });

  const [owners, setOwners] = useState([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [normalizedPreview, setNormalizedPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Fetch active owners for the dropdown mapping
  useEffect(() => {
    async function loadActiveOwners() {
      try {
        setLoadingOwners(true);
        const data = await listOwnersApi(token, { status: 'active', limit: 1000 });
        setOwners(data.items || []);
      } catch (err) {
        console.error('Failed to load active owners', err);
      } finally {
        setLoadingOwners(false);
      }
    }
    loadActiveOwners();
  }, [token]);

  // Load existing truck details if editing
  useEffect(() => {
    if (truck) {
      setForm({
        truckNumber: truck.truckNumber || '',
        ownerId: truck.ownerId?._id || truck.ownerId || '',
        status: truck.status || 'active',
        remarks: truck.remarks || ''
      });
      setNormalizedPreview(normalizeTruckNo(truck.truckNumber || ''));
      setSubmitError('');
    } else {
      setForm({
        truckNumber: '',
        ownerId: '',
        status: 'active',
        remarks: ''
      });
      setNormalizedPreview('');
      setSubmitError('');
    }
  }, [truck]);

  function normalizeTruckNo(val) {
    return val.toUpperCase().replace(/\s+/g, '');
  }

  function handleNumberChange(val) {
    setForm(prev => ({ ...prev, truckNumber: val }));
    setNormalizedPreview(normalizeTruckNo(val));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');

    if (!form.truckNumber.trim()) {
      setSubmitError('Truck number is required');
      return;
    }

    if (!form.ownerId) {
      setSubmitError('Owner mapping is required');
      return;
    }

    try {
      setIsSubmitting(true);
      // Construct normalized payload
      const payload = {
        ...form,
        truckNumber: normalizedPreview
      };
      await onSave(payload);
      onClose();
    } catch (err) {
      setSubmitError(err.message || 'Failed to save truck mapping');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>{truck?._id ? 'Edit Truck Mapping' : 'Add New Truck'}</h3>
          <button type="button" className="drawer-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="drawer-body">
          <form id="truck-drawer-form" className="drawer-form" onSubmit={handleSubmit}>
            {submitError && <div className="alert error">{submitError}</div>}

            <div className="form-group">
              <label>Truck Number *</label>
              <input
                type="text"
                required
                value={form.truckNumber}
                onChange={e => handleNumberChange(e.target.value)}
                placeholder="e.g. JH10B 1234"
              />
              {normalizedPreview && (
                <span className="helper-text" style={{ color: '#bae6fd' }}>
                  Normalized: <strong>{normalizedPreview}</strong>
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Map Owner *</label>
              {loadingOwners ? (
                <div style={{ color: '#94a3b8', fontSize: '14px' }}>Loading active owners...</div>
              ) : (
                <select
                  required
                  value={form.ownerId}
                  onChange={e => setForm(prev => ({ ...prev, ownerId: e.target.value }))}
                >
                  <option value="">-- Select Owner --</option>
                  {owners.map(o => (
                    <option key={o._id} value={o._id}>
                      {o.ownerName} {o.panNumber ? `(${o.panNumber})` : '(No PAN)'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <span className="helper-text">Only active truck mappings are used during automatic owner lookup.</span>
            </div>

            <div className="form-group">
              <label>Remarks / Notes</label>
              <textarea
                value={form.remarks}
                onChange={e => setForm(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Audit logs, driver contact or lease info"
                rows={3}
              />
            </div>

            <div className="commission-preview-help" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.1)' }}>
              <strong style={{ color: '#f87171' }}>⚠ Duplicate Active Mappings Constraint</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#cbd5e1' }}>
                Only one active record can exist for any normalized truck number at a time.
                If you are assigning this truck to a new owner, ensure the older owner's mapping is marked inactive.
              </p>
            </div>
          </form>
        </div>

        <div className="drawer-footer">
          <button type="button" className="action-btn secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" form="truck-drawer-form" className="action-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Mapping'}
          </button>
        </div>
      </div>
    </div>
  );
}
