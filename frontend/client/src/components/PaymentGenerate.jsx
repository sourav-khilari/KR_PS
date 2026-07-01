import { useEffect, useState } from 'react';
import { useAuth } from '../modules/auth/AuthContext.jsx';
import { getPaymentPreviewApi, listClientCompanies, listOwnersApi, listPlants, listTransportCompanies, savePaymentRunApi } from '../services/api.js';
import { PaymentPreview } from './PaymentPreview.jsx';

export function PaymentGenerate() {
  const { token } = useAuth();
  const [owners, setOwners] = useState([]);
  const [transportCompanies, setTransportCompanies] = useState([]);
  const [clientCompanies, setClientCompanies] = useState([]);
  const [plants, setPlants] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transportCompanyId, setTransportCompanyId] = useState('');
  const [clientCompanyId, setClientCompanyId] = useState('');
  const [plantId, setPlantId] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadOwners() {
      try {
        const res = await listOwnersApi(token, { status: 'active', limit: 200 });
        setOwners(res.items || []);
      } catch (err) {
        setError('Failed to load active owners: ' + err.message);
      }
    }
    async function loadMasters() {
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
        setError('Failed to load master options: ' + err.message);
      }
    }
    loadOwners();
    loadMasters();
  }, [token]);

  async function handlePreview(e) {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError('Start Date and End Date are required');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    setPreviewData(null);

    try {
      const data = await getPaymentPreviewApi({
        startDate,
        endDate,
        ownerId: selectedOwnerId,
        transportCompanyId,
        clientCompanyId,
        plantId,
        token
      });
      setPreviewData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch payment preview');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRun(finalBlocks, finalTotals) {
    setSaveLoading(true);
    setError('');
    try {
      const payload = {
        periodStart: previewData.periodStart,
        periodEnd: previewData.periodEnd,
        blocks: finalBlocks,
        totals: finalTotals,
        exportContext: {
          transportCompany: transportCompanies.find((item) => item._id === transportCompanyId)?.companyName || '',
          transportGst: transportCompanies.find((item) => item._id === transportCompanyId)?.gstin || '',
          clientCompany: clientCompanies.find((item) => item._id === clientCompanyId)?.companyName || previewData.settings?.companyName || '',
          plant: plants.find((item) => item._id === plantId)?.plantName || previewData.settings?.plantName || ''
        }
      };
      const res = await savePaymentRunApi(payload, token);
      setSuccessMsg(`Payout saved successfully! Payout ID: ${res._id}`);
      setPreviewData(null);
    } catch (err) {
      setError(err.message || 'Failed to save payout');
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <div className="payment-generate-wrap">
      {successMsg && <div className="alert success">{successMsg}</div>}
      {error && <div className="alert error">{error}</div>}

      {!previewData ? (
        <form className="payment-filter-form" onSubmit={handlePreview}>
          <h3>Select Payout Scope</h3>
          <div className="form-grid">
            <label>
              <span>Start Date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <label>
              <span>End Date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Transport Company</span>
              <select value={transportCompanyId} onChange={(e) => setTransportCompanyId(e.target.value)}>
                <option value="">All Transport Companies</option>
                {transportCompanies.map((item) => (
                  <option key={item._id} value={item._id}>{item.companyName}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Client Company</span>
              <select value={clientCompanyId} onChange={(e) => {
                setClientCompanyId(e.target.value);
                setPlantId('');
              }}>
                <option value="">All Client Companies</option>
                {clientCompanies.map((item) => (
                  <option key={item._id} value={item._id}>{item.companyName}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Plant</span>
              <select value={plantId} onChange={(e) => setPlantId(e.target.value)}>
                <option value="">All Plants</option>
                {plants.filter((item) => !clientCompanyId || item.clientCompanyId?._id === clientCompanyId || item.clientCompanyId === clientCompanyId).map((item) => (
                  <option key={item._id} value={item._id}>{item.plantName}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Transporter / Owner</span>
              <select
                value={selectedOwnerId}
                onChange={(e) => setSelectedOwnerId(e.target.value)}
              >
                <option value="">All Active Owners</option>
                {owners.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.ownerName} ({o.panNumber || 'No PAN'})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Analyzing Transactions...' : 'Analyze & Preview Payout'}
          </button>
        </form>
      ) : (
        <PaymentPreview
          preview={previewData}
          onSave={handleSaveRun}
          onCancel={() => setPreviewData(null)}
          saving={saveLoading}
        />
      )}
    </div>
  );
}
