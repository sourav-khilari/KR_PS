import { useMemo, useState } from 'react';

export function UploadPage({ onPreview, isLoading, transportCompanies, clientCompanies, plants }) {
  const [file, setFile] = useState(null);
  const [gstRate, setGstRate] = useState(18);
  const [transportCompanyId, setTransportCompanyId] = useState('');
  const [clientCompanyId, setClientCompanyId] = useState('');
  const [plantId, setPlantId] = useState('');

  const filteredPlants = useMemo(() => {
    if (!clientCompanyId) return plants || [];
    return (plants || []).filter((item) => item.clientCompanyId?._id === clientCompanyId || item.clientCompanyId === clientCompanyId);
  }, [clientCompanyId, plants]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!file) return;
    onPreview({ file, gstRate, transportCompanyId, clientCompanyId, plantId });
  }

  return (
    <section className="panel-surface upload-panel">
      <div className="upload-copy">
        <p className="eyebrow">Import workflow</p>
        <h2>Master Excel Upload</h2>
        <p>Preview parsed truck-owner master data before saving.</p>
        <div className="summary-pill-group">
          <span className="summary-pill">Upload workbook</span>
          <span className="summary-pill">Review validation</span>
          <span className="summary-pill">Save session</span>
        </div>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="field-shell">
          <span>Excel file</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>

        <label className="field-shell">
          <span>Transport company</span>
          <select value={transportCompanyId} onChange={(event) => setTransportCompanyId(event.target.value)}>
            <option value="">Select transport company</option>
            {transportCompanies?.map((item) => (
              <option key={item._id} value={item._id}>
                {item.companyName} {item.companyCode ? `(${item.companyCode})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="field-shell">
          <span>Client company</span>
          <select value={clientCompanyId} onChange={(event) => {
            setClientCompanyId(event.target.value);
            setPlantId('');
          }}>
            <option value="">Select client company</option>
            {clientCompanies?.map((item) => (
              <option key={item._id} value={item._id}>
                {item.companyName} {item.companyCode ? `(${item.companyCode})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="field-shell">
          <span>Plant</span>
          <select value={plantId} onChange={(event) => setPlantId(event.target.value)}>
            <option value="">Select plant</option>
            {filteredPlants?.map((item) => (
              <option key={item._id} value={item._id}>
                {item.plantName} {item.plantCode ? `(${item.plantCode})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="field-shell">
          <span>GST rate %</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={gstRate}
            onChange={(event) => setGstRate(event.target.value)}
          />
        </label>

        <button type="submit" disabled={!file || isLoading}>
          {isLoading ? 'Working...' : 'Preview Import'}
        </button>
      </form>
    </section>
  );
}
