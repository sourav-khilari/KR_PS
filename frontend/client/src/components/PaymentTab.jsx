import { useState } from 'react';
import { PaymentGenerate } from './PaymentGenerate.jsx';
import { PaymentSettings } from './PaymentSettings.jsx';
import { PaymentHistory } from './PaymentHistory.jsx';

export function PaymentTab() {
  const [activeSubTab, setActiveSubTab] = useState('generate');

  return (
    <section className="payment-tab-section panel-surface payment-workflow-shell">
      <header className="page-hero payment-hero">
        <div>
          <p className="eyebrow">Payments</p>
          <h2>Payment Workflow</h2>
          <p className="muted-copy">Generate payouts, tune rules, and review history in one responsive workspace.</p>
        </div>
        <div className="hero-chip-stack">
          <span className="summary-pill">Generate</span>
          <span className="summary-pill">Settings</span>
          <span className="summary-pill">History</span>
        </div>
      </header>

      <div className="tab-buttons workflow-tabs">
          <button
            type="button"
            className={activeSubTab === 'generate' ? 'active' : ''}
            onClick={() => setActiveSubTab('generate')}
          >
            Generate Payout
          </button>
          <button
            type="button"
            className={activeSubTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveSubTab('settings')}
          >
            Rule Settings
          </button>
          <button
            type="button"
            className={activeSubTab === 'history' ? 'active' : ''}
            onClick={() => setActiveSubTab('history')}
          >
            Payout History
          </button>
      </div>

      <div className="payment-tab-content payment-tab-card">
        {activeSubTab === 'generate' && <PaymentGenerate />}
        {activeSubTab === 'settings' && <PaymentSettings />}
        {activeSubTab === 'history' && <PaymentHistory />}
      </div>
    </section>
  );
}
