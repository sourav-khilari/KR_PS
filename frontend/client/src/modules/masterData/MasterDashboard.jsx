import { useEffect, useState } from 'react';
import { getMasterPrepSummaryApi } from '../../services/api.js';

export function MasterDashboard({ token, onNavigate, onEditOwner, onEditTruck }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const data = await getMasterPrepSummaryApi(token);
        setSummary(data);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [token]);

  if (loading) {
    return <div className="empty-cell">Loading master dashboard summary...</div>;
  }

  if (error) {
    return <div className="alert error">{error}</div>;
  }

  const { stats, warnings, recentlyUpdatedTrucks = [] } = summary || {};

  return (
    <div className="master-dashboard">
      <div className="master-header" style={{ marginBottom: '20px' }}>
        <h2>Master Management Dashboard</h2>
        <p>Overview of system master data, configurations, validation statuses, and quick action items.</p>
      </div>

      <div className="stat-cards-grid">
        <div className="stat-card success" onClick={() => onNavigate('owners')}>
          <div className="stat-card-title">Active / Total Owners</div>
          <div className="stat-card-value">
            {stats?.activeOwners || 0} <span style={{ fontSize: '16px', color: '#94a3b8' }}>/ {stats?.totalOwners || 0}</span>
          </div>
        </div>

        <div className="stat-card success" onClick={() => onNavigate('trucks')}>
          <div className="stat-card-title">Active / Total Trucks</div>
          <div className="stat-card-value">
            {stats?.activeTrucks || 0} <span style={{ fontSize: '16px', color: '#94a3b8' }}>/ {stats?.totalTrucks || 0}</span>
          </div>
        </div>

        <div className="stat-card warning" onClick={() => onNavigate('prep')}>
          <div className="stat-card-title">Owners Missing PAN</div>
          <div className="stat-card-value">{stats?.ownersMissingPan || 0}</div>
        </div>

        <div className="stat-card warning" onClick={() => onNavigate('prep')}>
          <div className="stat-card-title">Owners Missing TDS</div>
          <div className="stat-card-value">{stats?.ownersMissingTds || 0}</div>
        </div>

        <div className="stat-card warning" onClick={() => onNavigate('prep')}>
          <div className="stat-card-title">Owners Missing Comm.</div>
          <div className="stat-card-value">{stats?.ownersMissingCommission || 0}</div>
        </div>

        <div className="stat-card error" onClick={() => onNavigate('prep')}>
          <div className="stat-card-title">Trucks Unmapped</div>
          <div className="stat-card-value">{stats?.trucksWithoutOwner || 0}</div>
        </div>
      </div>

      <div className="master-grid-2">
        <div className="dashboard-panel">
          <h3>Quick Action Warnings</h3>
          {(!warnings?.missingPan?.length && !warnings?.missingTds?.length && !warnings?.missingCommission?.length && !warnings?.trucksWithoutOwner?.length) ? (
            <div className="empty-cell" style={{ padding: '40px' }}>
              ✓ All configurations are complete! Ready for payment generation.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {warnings?.trucksWithoutOwner?.length > 0 && (
                <div className="warnings-box" style={{ borderLeft: '4px solid #ef4444' }}>
                  <h4>⚠ Unmapped active trucks ({warnings.trucksWithoutOwner.length})</h4>
                  <ul className="warnings-list">
                    {warnings.trucksWithoutOwner.slice(0, 5).map(t => (
                      <li key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Truck: <strong>{t.truckNumber}</strong> has no active owner.</span>
                        <button className="action-btn secondary" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => onEditTruck(t)}>Map Owner</button>
                      </li>
                    ))}
                    {warnings.trucksWithoutOwner.length > 5 && <li>... and {warnings.trucksWithoutOwner.length - 5} more</li>}
                  </ul>
                </div>
              )}

              {warnings?.missingPan?.length > 0 && (
                <div className="warnings-box">
                  <h4>⚠ Owners missing PAN ({warnings.missingPan.length})</h4>
                  <ul className="warnings-list">
                    {warnings.missingPan.slice(0, 5).map(o => (
                      <li key={o._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Owner <strong>{o.ownerName}</strong> has no PAN.</span>
                        <button className="action-btn secondary" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => onEditOwner(o)}>Add PAN</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {warnings?.missingCommission?.length > 0 && (
                <div className="warnings-box">
                  <h4>⚠ Owners missing Commission Rule ({warnings.missingCommission.length})</h4>
                  <ul className="warnings-list">
                    {warnings.missingCommission.slice(0, 5).map(o => (
                      <li key={o._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Owner <strong>{o.ownerName}</strong> has no commission value/mapping set.</span>
                        <button className="action-btn secondary" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => onEditOwner(o)}>Set Commission</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="dashboard-panel">
          <h3>Recently Updated Trucks</h3>
          {recentlyUpdatedTrucks.length === 0 ? (
            <div className="empty-cell">No trucks updated recently (last 7 days).</div>
          ) : (
            <div className="master-table-wrap">
              <table style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Truck No.</th>
                    <th>Current Owner</th>
                    <th>Updated At</th>
                  </tr>
                </thead>
                <tbody>
                  {recentlyUpdatedTrucks.slice(0, 8).map(t => (
                    <tr key={t._id}>
                      <td style={{ fontWeight: 'bold' }}>{t.truckNumber}</td>
                      <td>{t.owner ? t.owner.ownerName : <span className="badge danger">Unmapped</span>}</td>
                      <td style={{ color: '#94a3b8' }}>
                        {new Date(t.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
