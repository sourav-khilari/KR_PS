import { useState } from 'react';
import { PaymentGenerate } from './PaymentGenerate.jsx';
import { PaymentSettings } from './PaymentSettings.jsx';
import { PaymentHistory } from './PaymentHistory.jsx';

export function PaymentTab() {
  const [activeSubTab, setActiveSubTab] = useState('generate');

  return (
    <section className="payment-tab-section">
      <header className="payment-tab-header">
        <h2>Payment Workflow</h2>
        <div className="tab-buttons">
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
      </header>

      <div className="payment-tab-content">
        {activeSubTab === 'generate' && <PaymentGenerate />}
        {activeSubTab === 'settings' && <PaymentSettings />}
        {activeSubTab === 'history' && <PaymentHistory />}
      </div>
    </section>
  );
}
