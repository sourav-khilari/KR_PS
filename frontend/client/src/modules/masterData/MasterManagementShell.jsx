import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { MasterDashboard } from './MasterDashboard.jsx';
import { OwnerMasterPage } from './OwnerMasterPage.jsx';
import { TruckMasterPage } from './TruckMasterPage.jsx';
import { MasterSettingsPage } from './MasterSettingsPage.jsx';
import { PaymentPrepPage } from './PaymentPrepPage.jsx';
import { UnifiedSearchPage } from './UnifiedSearchPage.jsx';
import TransportCompanyMasterPage from './TransportCompanyMasterPage.jsx';
import ClientCompanyMasterPage from './ClientCompanyMasterPage.jsx';
import PlantMasterPage from './PlantMasterPage.jsx';
import { CommissionRulePage } from './CommissionRulePage.jsx';

export function MasterManagementShell() {
  const { token } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  
  // Navigation states for warning drill downs
  const [drillOwner, setDrillOwner] = useState(null);
  const [drillTruck, setDrillTruck] = useState(null);

  function handleEditOwnerFromDashboard(owner) {
    setDrillOwner(owner);
    setActiveSubTab('owners');
  }

  function handleEditTruckFromDashboard(truck) {
    setDrillTruck(truck);
    setActiveSubTab('trucks');
  }

  return (
    <div className="master-shell">
      <nav className="master-sub-nav">
        <button
          type="button"
          className={`master-sub-nav-btn ${activeSubTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={`master-sub-nav-btn ${activeSubTab === 'owners' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('owners')}
        >
          Owners
        </button>
        <button
          type="button"
          className={`master-sub-nav-btn ${activeSubTab === 'trucks' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('trucks')}
        >
          Trucks
        </button>
        <button
          type="button"
          className={`master-sub-nav-btn ${activeSubTab === 'transport' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('transport')}
        >
          Transport Companies
        </button>
        <button
          type="button"
          className={`master-sub-nav-btn ${activeSubTab === 'clients' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('clients')}
        >
          Client Companies
        </button>
        <button
          type="button"
          className={`master-sub-nav-btn ${activeSubTab === 'plants' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('plants')}
        >
          Plants
        </button>
        <button
          type="button"
          className={`master-sub-nav-btn ${activeSubTab === 'prep' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('prep')}
        >
          Payment Prep Review
        </button>
        <button
          type="button"
          className={`master-sub-nav-btn ${activeSubTab === 'commission' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('commission')}
        >
          Commission Rules
        </button>
        <button
          type="button"
          className={`master-sub-nav-btn ${activeSubTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('search')}
        >
          Unified Search
        </button>
        <button
          type="button"
          className={`master-sub-nav-btn ${activeSubTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('settings')}
        >
          Global Settings
        </button>
      </nav>

      <section className="master-content">
        {activeSubTab === 'dashboard' && (
          <MasterDashboard
            token={token}
            onNavigate={setActiveSubTab}
            onEditOwner={handleEditOwnerFromDashboard}
            onEditTruck={handleEditTruckFromDashboard}
          />
        )}

        {activeSubTab === 'owners' && (
          <OwnerMasterPage
            token={token}
            selectedOwnerFromDashboard={drillOwner}
            onDrawerClosed={() => setDrillOwner(null)}
          />
        )}

        {activeSubTab === 'trucks' && (
          <TruckMasterPage
            token={token}
            selectedTruckFromDashboard={drillTruck}
            onDrawerClosed={() => setDrillTruck(null)}
          />
        )}

        {activeSubTab === 'transport' && <TransportCompanyMasterPage />}
        {activeSubTab === 'clients' && <ClientCompanyMasterPage />}
        {activeSubTab === 'plants' && <PlantMasterPage />}

        {activeSubTab === 'prep' && (
          <PaymentPrepPage
            token={token}
          />
        )}

        {activeSubTab === 'commission' && (
          <CommissionRulePage
            token={token}
          />
        )}

        {activeSubTab === 'search' && (
          <UnifiedSearchPage
            token={token}
          />
        )}

        {activeSubTab === 'settings' && (
          <MasterSettingsPage
            token={token}
          />
        )}
      </section>
    </div>
  );
}
