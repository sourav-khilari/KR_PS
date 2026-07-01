import { useEffect, useState } from 'react';
import { getMasterPrepSummaryApi, updateOwnerApi, updateTruckApi } from '../../services/api.js';
import { OwnerEditDrawer } from './OwnerEditDrawer.jsx';
import { TruckEditDrawer } from './TruckEditDrawer.jsx';

export function PaymentPrepPage({ token }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Drawer States
  const [activeOwner, setActiveOwner] = useState(null);
  const [activeTruck, setActiveTruck] = useState(null);

  async function loadSummary() {
    try {
      setLoading(true);
      const data = await getMasterPrepSummaryApi(token);
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Failed to load master prep warnings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, [token]);

  if (loading) {
    return <div className="empty-cell">Analyzing master data readiness...</div>;
  }

  if (error) {
    return <div className="alert error">{error}</div>;
  }

  const { stats = {}, warnings = {} } = summary || {};
  const activeOwners = stats.activeOwners || 0;
  const activeTrucks = stats.activeTrucks || 0;
  const totalIssues = (stats.ownersMissingPan || 0) + (stats.ownersMissingTds || 0) + (stats.ownersMissingCommission || 0) + (stats.trucksWithoutOwner || 0);
  const totalItems = activeOwners + activeTrucks || 1;
  const readinessScore = Math.max(0, Math.round(((totalItems - totalIssues) / totalItems) * 100));

  async function handleSaveOwner(formData) {
    try {
      await updateOwnerApi(activeOwner._id, formData, token);
      loadSummary();
    } catch (err) {
      throw new Error(err.message || 'Failed to update owner');
    }
  }

  async function handleSaveTruck(formData) {
    try {
      await updateTruckApi(activeTruck._id, formData, token);
      loadSummary();
    } catch (err) {
      throw new Error(err.message || 'Failed to update truck');
    }
  }

  return (
    <div className="payment-prep-page">
      <div className="master-header" style={{ marginBottom: '20px' }}>
        <h2>Payment Preparation & Rule Review</h2>
        <p>Ensure all active owners and trucks are correctly mapped and configured before generating payment sheets.</p>
      </div>

      <div className="dashboard-panel" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Master Data Readiness Score</strong>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Based on PAN validations, TDS rates, commission types, and truck mappings.
            </div>
          </div>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: readinessScore > 80 ? '#10b981' : readinessScore > 50 ? '#f59e0b' : '#ef4444' }}>
            {readinessScore}%
          </span>
        </div>
        <div className="readiness-score-bar">
          <div className="readiness-score-fill" style={{ width: `${readinessScore}%`, backgroundColor: readinessScore > 80 ? '#10b981' : readinessScore > 50 ? '#f59e0b' : '#ef4444' }}></div>
        </div>
      </div>

      {totalIssues === 0 ? (
        <div className="alert success" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <strong style={{ fontSize: '16px' }}>✓ All Ready!</strong>
          <span>There are no outstanding warnings or missing configurations for active masters. You can confidently proceed to the Payment Workflow tab.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {warnings.trucksWithoutOwner?.length > 0 && (
            <div className="dashboard-panel" style={{ borderLeft: '4px solid #ef4444' }}>
              <h3 style={{ color: '#f87171' }}>⚠ Trucks Missing Owner Mapping ({warnings.trucksWithoutOwner.length})</h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '-8px 0 16px 0' }}>
                These trucks are active in the database but have no registered owner reference. Payment preview rows for these trucks will fail to load or resolve an owner.
              </p>
              <div className="master-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Truck Number</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warnings.trucksWithoutOwner.map(t => (
                      <tr key={t._id}>
                        <td style={{ fontWeight: 'bold' }}>{t.truckNumber}</td>
                        <td><span className="badge danger">{t.status}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="action-btn"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => setActiveTruck(t)}
                          >
                            Map Owner
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {warnings.missingPan?.length > 0 && (
            <div className="dashboard-panel">
              <h3>⚠ Owners Missing PAN Number ({warnings.missingPan.length})</h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '-8px 0 16px 0' }}>
                Without a PAN, generating tax compliant payment sheets is not possible. Ensure a valid PAN is recorded to apply correct TDS rates.
              </p>
              <div className="master-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Owner Name</th>
                      <th>PAN Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warnings.missingPan.map(o => (
                      <tr key={o._id}>
                        <td style={{ fontWeight: 'bold' }}>{o.ownerName}</td>
                        <td><span className="badge danger">Missing</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="action-btn"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => setActiveOwner(o)}
                          >
                            Add PAN
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {warnings.missingTds?.length > 0 && (
            <div className="dashboard-panel">
              <h3>⚠ Owners with 0% or Missing TDS Rate ({warnings.missingTds.length})</h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '-8px 0 16px 0' }}>
                TDS rate defaults to 1%. If the owner is tax-exempt or has a special lower rate, confirm this. If not, set it to the standard 1% or 2% rate.
              </p>
              <div className="master-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Owner Name</th>
                      <th>Current TDS</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warnings.missingTds.map(o => (
                      <tr key={o._id}>
                        <td style={{ fontWeight: 'bold' }}>{o.ownerName}</td>
                        <td><span className="badge warning">{o.tdsPercentage ?? 0}%</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="action-btn"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => setActiveOwner(o)}
                          >
                            Set TDS
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {warnings.missingCommission?.length > 0 && (
            <div className="dashboard-panel">
              <h3>⚠ Owners Missing Commission Rules ({warnings.missingCommission.length})</h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '-8px 0 16px 0' }}>
                Commission is set to 0. If you do not charge commission for these owners, you can dismiss this warning. Otherwise, specify a flat rate, percentage, or truck-wise rule.
              </p>
              <div className="master-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Owner Name</th>
                      <th>Commission Type</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warnings.missingCommission.map(o => (
                      <tr key={o._id}>
                        <td style={{ fontWeight: 'bold' }}>{o.ownerName}</td>
                        <td><span className="badge warning">{o.commissionType} (value: {o.commissionValue})</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="action-btn"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => setActiveOwner(o)}
                          >
                            Set Rule
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeOwner && (
        <OwnerEditDrawer
          owner={activeOwner}
          onClose={() => setActiveOwner(null)}
          onSave={handleSaveOwner}
          token={token}
        />
      )}

      {activeTruck && (
        <TruckEditDrawer
          truck={activeTruck}
          onClose={() => setActiveTruck(null)}
          onSave={handleSaveTruck}
          token={token}
        />
      )}
    </div>
  );
}
