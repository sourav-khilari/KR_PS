import { useEffect, useState } from 'react';
import { useAuth } from '../modules/auth/AuthContext.jsx';
import {
  getGlobalSettingsApi,
  updateGlobalSettingsApi,
  listOwnersApi,
  updateOwnerApi
} from '../services/api.js';

export function PaymentSettings() {
  const { token } = useAuth();
  const [globalSettings, setGlobalSettings] = useState({
    companyName: '',
    companyGstin: '',
    plantName: '',
    cgstRate: 9,
    sgstRate: 9
  });
  const [owners, setOwners] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [ownerTds, setOwnerTds] = useState(1);
  const [ownerCommType, setOwnerCommType] = useState('fixed');
  const [ownerCommVal, setOwnerCommVal] = useState(900);
  const [newTruckNo, setNewTruckNo] = useState('');
  const [newTruckComm, setNewTruckComm] = useState('');
  const [truckMapDraft, setTruckMapDraft] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadSettingsAndOwners() {
      setLoading(true);
      try {
        const globalRes = await getGlobalSettingsApi(token);
        setGlobalSettings(globalRes);

        const ownersRes = await listOwnersApi(token, { status: 'active', limit: 200 });
        setOwners(ownersRes.items || []);
      } catch (err) {
        setError('Failed to load settings data: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSettingsAndOwners();
  }, [token]);

  async function handleGlobalSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const parsed = {
        ...globalSettings,
        cgstRate: Number(globalSettings.cgstRate) || 0,
        sgstRate: Number(globalSettings.sgstRate) || 0
      };
      const res = await updateGlobalSettingsApi(parsed, token);
      setGlobalSettings(res);
      setSuccess('Global settings updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update global settings');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectOwner(owner) {
    setSelectedOwner(owner);
    setOwnerTds(owner.tdsPercentage ?? 1);
    setOwnerCommType(owner.commissionType ?? 'fixed');
    setOwnerCommVal(owner.commissionValue ?? 900);
    setTruckMapDraft(owner.truckWiseCommissionMap || {});
    setNewTruckNo('');
    setNewTruckComm('');
  }

  function handleAddTruckComm() {
    if (!newTruckNo) return;
    const cleanNo = newTruckNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanVal = Number(newTruckComm) || 0;
    setTruckMapDraft((current) => ({
      ...current,
      [cleanNo]: cleanVal
    }));
    setNewTruckNo('');
    setNewTruckComm('');
  }

  function handleRemoveTruckComm(truckKey) {
    setTruckMapDraft((current) => {
      const copy = { ...current };
      delete copy[truckKey];
      return copy;
    });
  }

  async function handleOwnerSubmit(e) {
    e.preventDefault();
    if (!selectedOwner) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        tdsPercentage: Number(ownerTds),
        commissionType: ownerCommType,
        commissionValue: Number(ownerCommVal),
        truckWiseCommissionMap: truckMapDraft
      };
      const res = await updateOwnerApi(selectedOwner._id, payload, token);

      // update local owners list
      setOwners((current) => current.map((o) => (o._id === res._id ? res : o)));
      setSelectedOwner(res);
      setSuccess(`Updated settings for owner: ${res.ownerName}`);
    } catch (err) {
      setError(err.message || 'Failed to update owner settings');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="payment-settings-container">
      {success && <div className="alert success">{success}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="settings-split-layout">
        {/* Global Settings Form */}
        <section className="settings-card global-settings-card">
          <h3>Global GST & Rounding Settings</h3>
          <form onSubmit={handleGlobalSubmit}>
            <label>
              <span>Company Name</span>
              <input
                type="text"
                value={globalSettings.companyName || ''}
                onChange={(e) => setGlobalSettings({ ...globalSettings, companyName: e.target.value })}
              />
            </label>
            <label>
              <span>Plant Location Name</span>
              <input
                type="text"
                value={globalSettings.plantName || ''}
                onChange={(e) => setGlobalSettings({ ...globalSettings, plantName: e.target.value })}
              />
            </label>
            <div className="form-row-2">
              <label>
                <span>CGST Rate (%)</span>
                <input
                  type="number"
                  value={globalSettings.cgstRate || 0}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, cgstRate: e.target.value })}
                />
              </label>
              <label>
                <span>SGST Rate (%)</span>
                <input
                  type="number"
                  value={globalSettings.sgstRate || 0}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, sgstRate: e.target.value })}
                />
              </label>
            </div>
            <label>
              <span>Rounding Mode</span>
              <select
                value={globalSettings.defaultRoundingRule || 'round'}
                onChange={(e) => setGlobalSettings({ ...globalSettings, defaultRoundingRule: e.target.value })}
              >
                <option value="round">Round to nearest whole number</option>
                <option value="half_up">Round half up</option>
                <option value="none">No rounding</option>
              </select>
            </label>
            <button type="submit" className="submit-btn" disabled={loading}>
              Save Global Rules
            </button>
          </form>
        </section>

        {/* Owner Settings configuration */}
        <section className="settings-card owner-settings-card">
          <h3>Owner TDS & Commission Rules</h3>
          <div className="owner-selection-pane">
            <label>
              <span>Select Owner to Configure</span>
              <select
                value={selectedOwner?._id || ''}
                onChange={(e) => {
                  const owner = owners.find((o) => o._id === e.target.value);
                  if (owner) handleSelectOwner(owner);
                }}
              >
                <option value="" disabled>
                  -- Select Owner --
                </option>
                {owners.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.ownerName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedOwner && (
            <form onSubmit={handleOwnerSubmit} className="owner-rules-form">
              <h4>Configure Rules for: {selectedOwner.ownerName}</h4>
              <div className="form-row-2">
                <label>
                  <span>TDS Percentage (%)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={ownerTds}
                    onChange={(e) => setOwnerTds(e.target.value)}
                  />
                </label>
                <label>
                  <span>Commission Mode</span>
                  <select value={ownerCommType} onChange={(e) => setOwnerCommType(e.target.value)}>
                    <option value="fixed">Fixed Per Daily Truck Group</option>
                    <option value="percentage">Percentage of Row Amount</option>
                    <option value="truck_wise">Truck-Specific Commission Rates</option>
                  </select>
                </label>
              </div>

              <label>
                <span>Commission Value (₹ / %)</span>
                <input type="number" value={ownerCommVal} onChange={(e) => setOwnerCommVal(e.target.value)} />
                <small className="help-text">
                  Acts as fixed rate (e.g. 900) or percentage rate (e.g. 2%). For truck-specific mode, this is the fallback rate.
                </small>
              </label>

              {ownerCommType === 'truck_wise' && (
                <div className="truck-rates-editor">
                  <h5>Truck-Specific Rates Mapping</h5>
                  <div className="truck-rate-row input-row">
                    <input
                      type="text"
                      placeholder="Truck No (e.g. WB60A1234)"
                      value={newTruckNo}
                      onChange={(e) => setNewTruckNo(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Commission Value (₹)"
                      value={newTruckComm}
                      onChange={(e) => setNewTruckComm(e.target.value)}
                    />
                    <button type="button" onClick={handleAddTruckComm}>
                      Add Map
                    </button>
                  </div>

                  <ul className="mapped-truck-rates-list">
                    {Object.entries(truckMapDraft).map(([truckNo, val]) => (
                      <li key={truckNo}>
                        <span>
                          {truckNo}: <strong>₹{val}</strong>
                        </span>
                        <button type="button" className="remove-btn" onClick={() => handleRemoveTruckComm(truckNo)}>
                          Remove
                        </button>
                      </li>
                    ))}
                    {Object.keys(truckMapDraft).length === 0 && <p className="help-text">No custom truck rates configured.</p>}
                  </ul>
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={loading}>
                Save Owner Settings
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
