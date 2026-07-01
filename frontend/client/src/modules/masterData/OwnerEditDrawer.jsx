import { useEffect, useMemo, useState } from 'react';
import { listClientCompanies, listPlants, listTransportCompanies, listTrucksApi } from '../../services/api.js';

export function OwnerEditDrawer({ owner, onClose, onSave, token }) {
  const [form, setForm] = useState({
    ownerName: '',
    panNumber: '',
    mobileNumber: '',
    address: '',
    tdsPercentage: 1,
    commissionType: 'fixed',
    commissionValue: 0,
    status: 'active',
    remarks: '',
    truckWiseCommissionMap: {}
  });

  const [trucks, setTrucks] = useState([]);
  const [transportCompanies, setTransportCompanies] = useState([]);
  const [clientCompanies, setClientCompanies] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loadingTrucks, setLoadingTrucks] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [newRuleTransportId, setNewRuleTransportId] = useState('');
  const [newRuleClientId, setNewRuleClientId] = useState('');
  const [newRulePlantId, setNewRulePlantId] = useState('');
  const [newRuleTruckNo, setNewRuleTruckNo] = useState('');
  const [newRuleCommission, setNewRuleCommission] = useState('');
  const [panError, setPanError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const filteredClients = useMemo(() => clientCompanies, [clientCompanies]);

  const filteredPlants = useMemo(() => {
    if (!newRuleClientId) return plants;
    return plants.filter((plant) => plant.clientCompanyId?._id === newRuleClientId || plant.clientCompanyId === newRuleClientId);
  }, [newRuleClientId, plants]);

  useEffect(() => {
    async function loadLookups() {
      setLoadingLookups(true);
      try {
        const [transportRes, clientRes, plantRes] = await Promise.all([
          listTransportCompanies(token, { limit: 100 }),
          listClientCompanies(token, { limit: 100 }),
          listPlants(token, { limit: 100 })
        ]);
        setTransportCompanies(transportRes.items || []);
        setClientCompanies(clientRes.items || []);
        setPlants(plantRes.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingLookups(false);
      }
    }

    if (token) {
      loadLookups();
    }
  }, [token]);

  useEffect(() => {
    if (owner) {
      setForm({
        ownerName: owner.ownerName || '',
        panNumber: owner.panNumber || '',
        mobileNumber: owner.mobileNumber || '',
        address: owner.address || '',
        tdsPercentage: owner.tdsPercentage ?? 1,
        commissionType: owner.commissionType || 'fixed',
        commissionValue: owner.commissionValue ?? 0,
        status: owner.status || 'active',
        remarks: owner.remarks || '',
        truckWiseCommissionMap: owner.truckWiseCommissionMap || {}
      });
      setPanError('');
      setSubmitError('');

      // Load trucks owned by this owner
      if (owner._id) {
        setLoadingTrucks(true);
        listTrucksApi(token, { ownerId: owner._id, limit: 100 })
          .then(data => {
            setTrucks(data.items || []);
          })
          .catch(() => {})
          .finally(() => setLoadingTrucks(false));
      }
    } else {
      setForm({
        ownerName: '',
        panNumber: '',
        mobileNumber: '',
        address: '',
        tdsPercentage: 1,
        commissionType: 'fixed',
        commissionValue: 0,
        status: 'active',
        remarks: '',
        truckWiseCommissionMap: {}
      });
      setTrucks([]);
      setPanError('');
      setSubmitError('');
    }
  }, [owner, token]);

  function handleChange(field, value) {
    if (field === 'panNumber') {
      const upperVal = value.toUpperCase();
      setForm(prev => ({ ...prev, panNumber: upperVal }));
      if (upperVal && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(upperVal)) {
        setPanError('Invalid PAN format (e.g. ABCDE1234F)');
      } else {
        setPanError('');
      }
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  }

  function handleMapValueChange(ruleKey, val) {
    const parsed = val === '' ? 0 : Number(val);
    setForm(prev => ({
      ...prev,
      truckWiseCommissionMap: {
        ...prev.truckWiseCommissionMap,
        [ruleKey]: parsed
      }
    }));
  }

  function handleRemoveMapKey(ruleKey) {
    setForm(prev => {
      const copy = { ...prev.truckWiseCommissionMap };
      delete copy[ruleKey];
      return {
        ...prev,
        truckWiseCommissionMap: copy
      };
    });
  }

  function handleAddCustomTruckCommission() {
    if (!newRuleTruckNo.trim()) return;
    const normTruck = newRuleTruckNo.toUpperCase().replace(/\s+/g, '');
    const val = newRuleCommission === '' ? 0 : Number(newRuleCommission);
    const contextKey = [newRuleTransportId, newRuleClientId, newRulePlantId, normTruck]
      .filter(Boolean)
      .join('|');

    if (!contextKey) return;

    setForm(prev => ({
      ...prev,
      truckWiseCommissionMap: {
        ...prev.truckWiseCommissionMap,
        [contextKey]: val
      }
    }));
    setNewRuleTruckNo('');
    setNewRuleCommission('');
  }

  function getRuleDisplay(ruleKey) {
    const parts = String(ruleKey).split('|');
    const transport = transportCompanies.find((item) => item._id === parts[0]);
    const client = clientCompanies.find((item) => item._id === parts[1]);
    const plant = plants.find((item) => item._id === parts[2]);
    const truck = parts[3] || '';

    return [
      transport?.companyName || parts[0] || 'Any Transport',
      client?.companyName || parts[1] || 'Any Client',
      plant?.plantName || parts[2] || 'Any Plant',
      truck || 'Any Truck'
    ].join(' • ');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');

    if (!form.ownerName.trim()) {
      setSubmitError('Owner name is required');
      return;
    }

    if (form.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panNumber)) {
      setSubmitError('Invalid PAN format');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(form);
      onClose();
    } catch (err) {
      setSubmitError(err.message || 'Failed to save owner data');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>{owner?._id ? 'Edit Owner Details' : 'Create New Owner'}</h3>
          <button type="button" className="drawer-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="drawer-body">
          <form id="owner-drawer-form" className="drawer-form" onSubmit={handleSubmit}>
            {submitError && <div className="alert error">{submitError}</div>}

            <div className="form-group">
              <label>Owner Name *</label>
              <input
                type="text"
                required
                value={form.ownerName}
                onChange={e => handleChange('ownerName', e.target.value)}
                placeholder="Full Name / Company Name"
              />
            </div>

            <div className="form-group">
              <label>PAN Number</label>
              <input
                type="text"
                maxLength={10}
                value={form.panNumber}
                onChange={e => handleChange('panNumber', e.target.value)}
                placeholder="ABCDE1234F"
              />
              {panError && <span className="input-error">{panError}</span>}
              {form.panNumber && !panError && <span className="badge success" style={{ alignSelf: 'flex-start', marginTop: '4px' }}>✓ Valid Format</span>}
            </div>

            <div className="form-group">
              <label>Mobile Number</label>
              <input
                type="text"
                value={form.mobileNumber}
                onChange={e => handleChange('mobileNumber', e.target.value)}
                placeholder="10-digit mobile number"
              />
            </div>

            <div className="form-group">
              <label>Address</label>
              <textarea
                value={form.address}
                onChange={e => handleChange('address', e.target.value)}
                placeholder="Full Address"
                rows={2}
              />
            </div>

            <div className="form-group">
              <label>TDS Percentage (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.tdsPercentage}
                onChange={e => handleChange('tdsPercentage', e.target.value === '' ? '' : Number(e.target.value))}
              />
              <span className="helper-text">Standard rate is 1% for individuals/proprietorships, 2% for others.</span>
            </div>

            <div className="form-group">
              <label>Commission Rule Type</label>
              <select
                value={form.commissionType}
                onChange={e => handleChange('commissionType', e.target.value)}
              >
                <option value="fixed">Fixed Amount (per truck-run)</option>
                <option value="percentage">Percentage (of Gross Freight)</option>
                <option value="truck_wise">Truck-wise Mapped Value</option>
              </select>
            </div>

            {(form.commissionType === 'fixed' || form.commissionType === 'percentage') && (
              <div className="form-group">
                <label>
                  {form.commissionType === 'fixed' ? 'Commission Amount (INR)' : 'Commission Rate (%)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.commissionValue}
                  onChange={e => handleChange('commissionValue', e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            )}

            {form.commissionType === 'truck_wise' && (
              <div className="form-group">
                <label>Truck-wise Commission Rules</label>
                <div className="truck-commission-map-editor">
                  {loadingLookups || loadingTrucks ? (
                    <div style={{ padding: '10px', color: '#94a3b8' }}>Loading owner and context data...</div>
                  ) : (
                    <>
                      <div style={{ marginBottom: '10px', fontSize: '12px', color: '#cbd5e1' }}>
                        Add one row per truck-context combination. Select a transport, then choose any client and its matching plants for the commission rule.
                      </div>

                      <div className="truck-commission-row" style={{ marginTop: '6px', borderTop: '1px solid #334155', paddingTop: '12px', flexWrap: 'wrap' }}>
                        <select value={newRuleTransportId} onChange={(e) => { setNewRuleTransportId(e.target.value); }} style={{ minWidth: '140px' }}>
                          <option value="">Any Transport</option>
                          {transportCompanies.map((item) => <option key={item._id} value={item._id}>{item.companyName}</option>)}
                        </select>
                        <select value={newRuleClientId} onChange={(e) => { setNewRuleClientId(e.target.value); setNewRulePlantId(''); }} style={{ minWidth: '140px' }}>
                          <option value="">Any Client</option>
                          {filteredClients.map((item) => <option key={item._id} value={item._id}>{item.companyName}</option>)}
                        </select>
                        <select value={newRulePlantId} onChange={(e) => setNewRulePlantId(e.target.value)} style={{ minWidth: '140px' }}>
                          <option value="">Any Plant</option>
                          {filteredPlants.map((item) => <option key={item._id} value={item._id}>{item.plantName}</option>)}
                        </select>
                        <select value={newRuleTruckNo} onChange={(e) => setNewRuleTruckNo(e.target.value)} style={{ minWidth: '140px' }}>
                          <option value="">Select Truck</option>
                          {trucks.map((truck) => <option key={truck._id} value={truck.truckNumber}>{truck.truckNumber}</option>)}
                        </select>
                        <input
                          type="number"
                          placeholder="Commission"
                          value={newRuleCommission}
                          onChange={(e) => setNewRuleCommission(e.target.value)}
                          style={{ minWidth: '110px' }}
                        />
                        <button
                          type="button"
                          className="action-btn secondary"
                          style={{ padding: '8px' }}
                          onClick={handleAddCustomTruckCommission}
                        >
                          + Add Rule
                        </button>
                      </div>

                      {Object.keys(form.truckWiseCommissionMap || {}).length === 0 ? (
                        <div style={{ padding: '10px', color: '#94a3b8' }}>No truck-wise rules added yet.</div>
                      ) : (
                        Object.keys(form.truckWiseCommissionMap || {}).map((ruleKey) => {
                          const mapVal = form.truckWiseCommissionMap[ruleKey] ?? '';
                          return (
                            <div className="truck-commission-row" key={ruleKey} style={{ flexWrap: 'wrap' }}>
                              <span style={{ color: '#38bdf8', fontWeight: 'bold', minWidth: '320px' }}>{getRuleDisplay(ruleKey)}</span>
                              <input
                                type="number"
                                value={mapVal}
                                onChange={(e) => handleMapValueChange(ruleKey, e.target.value)}
                                style={{ minWidth: '110px' }}
                              />
                              <button
                                type="button"
                                className="action-btn danger"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                onClick={() => handleRemoveMapKey(ruleKey)}
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Status</label>
              <select
                value={form.status}
                onChange={e => handleChange('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="form-group">
              <label>Remarks</label>
              <textarea
                value={form.remarks}
                onChange={e => handleChange('remarks', e.target.value)}
                placeholder="Internal audit notes or changes remarks"
                rows={2}
              />
            </div>

            <div className="commission-preview-help">
              <strong>💡 Payment Sheet Impact</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#cbd5e1' }}>
                Any modifications here will instantly adjust future payment sheets generated for this owner.
                TDS rate is applied against the Net Taxable Freight. Commission is deducted per row.
              </p>
            </div>
          </form>
        </div>

        <div className="drawer-footer">
          <button type="button" className="action-btn secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" form="owner-drawer-form" className="action-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
