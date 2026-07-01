import { useState } from 'react';
import { listOwnersApi, listTrucksApi, updateOwnerApi, updateTruckApi } from '../../services/api.js';
import { OwnerEditDrawer } from './OwnerEditDrawer.jsx';
import { TruckEditDrawer } from './TruckEditDrawer.jsx';

export function UnifiedSearchPage({ token }) {
  const [query, setQuery] = useState('');
  const [owners, setOwners] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Drawer states
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [selectedTruck, setSelectedTruck] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const [ownerRes, truckRes] = await Promise.all([
        listOwnersApi(token, { q: query, limit: 20 }),
        listTrucksApi(token, { q: query, limit: 20 })
      ]);
      setOwners(ownerRes.items || []);
      setTrucks(truckRes.items || []);
    } catch (err) {
      console.error('Unified search failed', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveOwner(formData) {
    try {
      await updateOwnerApi(selectedOwner._id, formData, token);
      // Refresh results
      const res = await listOwnersApi(token, { q: query, limit: 20 });
      setOwners(res.items || []);
    } catch (err) {
      throw new Error(err.message || 'Failed to update owner');
    }
  }

  async function handleSaveTruck(formData) {
    try {
      await updateTruckApi(selectedTruck._id, formData, token);
      // Refresh results
      const res = await listTrucksApi(token, { q: query, limit: 20 });
      setTrucks(res.items || []);
    } catch (err) {
      throw new Error(err.message || 'Failed to update truck');
    }
  }

  return (
    <div className="unified-search-page">
      <div className="master-header" style={{ marginBottom: '20px' }}>
        <h2>Unified Master Search</h2>
        <p>Locate owners, trucks, PANs, commission configurations, and status indexes from a single interface.</p>
      </div>

      <form className="unified-search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search by owner name, PAN number, truck number, commission type..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button type="submit" className="action-btn" style={{ padding: '0 24px' }} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {loading ? (
        <div className="empty-cell">Searching database indexes...</div>
      ) : !searched ? (
        <div className="empty-cell" style={{ padding: '60px' }}>
          Type a query above to start searching (e.g. Owner name, PAN, or Truck No.)
        </div>
      ) : (
        <div className="master-grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="search-results-section">
            <h3>Matching Owners ({owners.length})</h3>
            {owners.length === 0 ? (
              <div className="search-no-results">No owners found matching "{query}".</div>
            ) : (
              <div className="master-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name / PAN</th>
                      <th>Commission</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {owners.map(o => (
                      <tr key={o._id}>
                        <td>
                          <strong>{o.ownerName}</strong>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            PAN: {o.panNumber || 'Missing'} | TDS: {o.tdsPercentage}%
                          </div>
                        </td>
                        <td>{o.commissionType} ({o.commissionValue})</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="action-btn secondary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => setSelectedOwner(o)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="search-results-section">
            <h3>Matching Trucks ({trucks.length})</h3>
            {trucks.length === 0 ? (
              <div className="search-no-results">No trucks found matching "{query}".</div>
            ) : (
              <div className="master-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Truck No. / Owner</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trucks.map(t => (
                      <tr key={t._id}>
                        <td>
                          <strong>{t.truckNumber}</strong>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            Mapped to: {t.ownerId?.ownerName || 'Unmapped'}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${t.status === 'active' ? 'success' : 'danger'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="action-btn secondary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => setSelectedTruck(t)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedOwner && (
        <OwnerEditDrawer
          owner={selectedOwner}
          onClose={() => setSelectedOwner(null)}
          onSave={handleSaveOwner}
          token={token}
        />
      )}

      {selectedTruck && (
        <TruckEditDrawer
          truck={selectedTruck}
          onClose={() => setSelectedTruck(null)}
          onSave={handleSaveTruck}
          token={token}
        />
      )}
    </div>
  );
}
