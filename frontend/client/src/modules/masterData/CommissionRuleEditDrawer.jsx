import { useEffect, useState } from 'react';
import {
  listOwnersApi,
  listTransportCompanies,
  listClientCompanies,
  listPlants
} from '../../services/api.js';

export function CommissionRuleEditDrawer({ rule, onClose, onSave, token }) {
  const [form, setForm] = useState({
    ownerId: '',
    transportCompanyId: '',
    clientCompanyId: '',
    plantId: '',
    truckNumber: '',
    commissionType: 'fixed',
    commissionValue: 0,
    status: 'active',
    remarks: ''
  });

  const [owners, setOwners] = useState([]);
  const [transportCompanies, setTransportCompanies] = useState([]);
  const [clientCompanies, setClientCompanies] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    async function loadLookups() {
      setLoadingLookups(true);
      try {
        const [ownerRes, transportRes, clientRes, plantRes] = await Promise.all([
          listOwnersApi(token, { limit: 100, status: 'active' }),
          listTransportCompanies(token, { limit: 100, status: 'active' }),
          listClientCompanies(token, { limit: 100, status: 'active' }),
          listPlants(token, { limit: 100, status: 'active' })
        ]);
        setOwners(ownerRes.items || []);
        setTransportCompanies(transportRes.items || []);
        setClientCompanies(clientRes.items || []);
        setPlants(plantRes.items || []);
      } catch (err) {
        console.error('Failed to load dropdown masters:', err);
      } finally {
        setLoadingLookups(false);
      }
    }

    if (token) {
      loadLookups();
    }
  }, [token]);

  useEffect(() => {
    if (rule) {
      setForm({
        ownerId: rule.ownerId?._id || rule.ownerId || '',
        transportCompanyId: rule.transportCompanyId?._id || rule.transportCompanyId || '',
        clientCompanyId: rule.clientCompanyId?._id || rule.clientCompanyId || '',
        plantId: rule.plantId?._id || rule.plantId || '',
        truckNumber: rule.truckNumber || '',
        commissionType: rule.commissionType || 'fixed',
        commissionValue: rule.commissionValue ?? 0,
        status: rule.status || 'active',
        remarks: rule.remarks || ''
      });
      setSubmitError('');
    } else {
      setForm({
        ownerId: '',
        transportCompanyId: '',
        clientCompanyId: '',
        plantId: '',
        truckNumber: '',
        commissionType: 'fixed',
        commissionValue: 0,
        status: 'active',
        remarks: ''
      });
      setSubmitError('');
    }
  }, [rule]);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setSubmitError(err.message || 'Failed to save commission rule');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>{rule ? 'Edit Commission Rule' : 'Add Commission Rule'}</h3>
          <button type="button" className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {submitError && <div className="alert error">{submitError}</div>}
        {loadingLookups && <div className="loading">Loading dropdown options...</div>}

        <form onSubmit={handleSubmit} className="drawer-form">
          <div className="form-group">
            <label htmlFor="rule-owner">Owner *</label>
            <select
              id="rule-owner"
              value={form.ownerId}
              onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
              required
            >
              <option value="">Select Owner</option>
              {owners.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.ownerName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="rule-transport">Transport Company *</label>
            <select
              id="rule-transport"
              value={form.transportCompanyId}
              onChange={(e) => setForm({ ...form, transportCompanyId: e.target.value })}
              required
            >
              <option value="">Select Transport Company</option>
              {transportCompanies.map((tc) => (
                <option key={tc._id} value={tc._id}>
                  {tc.companyName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="rule-client">Client Company *</label>
            <select
              id="rule-client"
              value={form.clientCompanyId}
              onChange={(e) => setForm({ ...form, clientCompanyId: e.target.value })}
              required
            >
              <option value="">Select Client Company</option>
              {clientCompanies.map((cc) => (
                <option key={cc._id} value={cc._id}>
                  {cc.companyName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="rule-plant">Plant *</label>
            <select
              id="rule-plant"
              value={form.plantId}
              onChange={(e) => setForm({ ...form, plantId: e.target.value })}
              required
            >
              <option value="">Select Plant</option>
              {plants.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.plantName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="rule-truck">Truck Number (Optional)</label>
            <input
              type="text"
              id="rule-truck"
              placeholder="e.g. JH10CQ3188"
              value={form.truckNumber}
              onChange={(e) => setForm({ ...form, truckNumber: e.target.value.toUpperCase().replace(/\s+/g, '') })}
            />
            <small className="form-hint">Leave blank to apply this rule to all trucks of this Owner/Route.</small>
          </div>

          <div className="form-group">
            <label htmlFor="rule-type">Commission Type *</label>
            <select
              id="rule-type"
              value={form.commissionType}
              onChange={(e) => setForm({ ...form, commissionType: e.target.value, commissionValue: 0 })}
              required
            >
              <option value="fixed">Fixed</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="rule-value">
              {form.commissionType === 'percentage' ? 'Commission Percentage (%) *' : 'Commission Fixed Value (₹) *'}
            </label>
            <input
              type="number"
              id="rule-value"
              min="0"
              max={form.commissionType === 'percentage' ? '100' : undefined}
              step={form.commissionType === 'percentage' ? '0.01' : '1'}
              value={form.commissionValue}
              onChange={(e) => setForm({ ...form, commissionValue: Number(e.target.value) })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="rule-status">Status *</label>
            <select
              id="rule-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              required
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="rule-remarks">Remarks</label>
            <textarea
              id="rule-remarks"
              rows="3"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>

          <div className="drawer-actions">
            <button
              type="button"
              className="btn secondary-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn primary-btn"
              disabled={isSubmitting || loadingLookups}
            >
              {isSubmitting ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
