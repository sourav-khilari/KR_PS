import { useEffect, useState } from 'react';
import { getGlobalSettingsApi, updateGlobalSettingsApi } from '../../services/api.js';

export function MasterSettingsPage({ token }) {
  const [settings, setSettings] = useState({
    companyName: 'SHREE CEMENT LTD.',
    companyGstin: '',
    plantName: 'PURULIA',
    cgstRate: 9,
    sgstRate: 9,
    defaultRoundingRule: 'round'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      setError('');
      try {
        const data = await getGlobalSettingsApi(token);
        if (data) {
          setSettings({
            companyName: data.companyName || 'SHREE CEMENT LTD.',
            companyGstin: data.companyGstin || '',
            plantName: data.plantName || 'PURULIA',
            cgstRate: data.cgstRate ?? 9,
            sgstRate: data.sgstRate ?? 9,
            defaultRoundingRule: data.defaultRoundingRule || 'round'
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch global settings');
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [token]);

  function handleChange(field, val) {
    setSettings(prev => ({ ...prev, [field]: val }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const payload = {
        ...settings,
        cgstRate: Number(settings.cgstRate),
        sgstRate: Number(settings.sgstRate)
      };

      await updateGlobalSettingsApi(payload, token);
      setSuccess('Settings updated successfully. These will apply to all future payment previews.');
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="empty-cell">Loading settings...</div>;
  }

  return (
    <div className="master-settings-page" style={{ maxWidth: '600px' }}>
      <div className="master-header" style={{ marginBottom: '24px' }}>
        <h2>Company & Payment Settings</h2>
        <p>Configure CGST, SGST, billing entity names, and calculation rules used in invoice sheets.</p>
      </div>

      {success && <div className="alert success">{success}</div>}
      {error && <div className="alert error">{error}</div>}

      <form className="drawer-form" onSubmit={handleSave} style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
        <div className="form-group">
          <label>Company / Billing Entity Name</label>
          <input
            type="text"
            required
            value={settings.companyName}
            onChange={e => handleChange('companyName', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Company GSTIN</label>
          <input
            type="text"
            value={settings.companyGstin}
            onChange={e => handleChange('companyGstin', e.target.value.toUpperCase())}
            placeholder="e.g. 19AAAAA1111A1Z1"
          />
        </div>

        <div className="form-group">
          <label>Plant / Location Name</label>
          <input
            type="text"
            value={settings.plantName}
            onChange={e => handleChange('plantName', e.target.value.toUpperCase())}
          />
        </div>

        <div className="master-grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label>CGST Rate (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={settings.cgstRate}
              onChange={e => handleChange('cgstRate', e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>SGST Rate (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={settings.sgstRate}
              onChange={e => handleChange('sgstRate', e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Default Rounding Policy</label>
          <select
            value={settings.defaultRoundingRule}
            onChange={e => handleChange('defaultRoundingRule', e.target.value)}
          >
            <option value="round">Math.round (Standard Rounding to Nearest 1 INR)</option>
            <option value="ceil">Math.ceil (Always Round Up)</option>
            <option value="floor">Math.floor (Always Round Down / Truncate decimals)</option>
          </select>
        </div>

        <div className="commission-preview-help" style={{ marginTop: '12px' }}>
          <strong>ℹ Settings Lifetime</strong>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#cbd5e1' }}>
            Changing company details or CGST/SGST rates updates calculations for future payment previews only. Older, saved finalized payment runs remain locked to their snapshot values.
          </p>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="action-btn" disabled={isSaving}>
            {isSaving ? 'Saving Settings...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
