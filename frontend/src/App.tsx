import React, { useState, useEffect } from 'react';
import { api } from './api';
import { Sidebar } from './components/Sidebar';
import type { ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewDashboard } from './components/OverviewDashboard';
import { InvestigateWorkspace } from './components/InvestigateWorkspace';
import { RecoveryView } from './components/RecoveryView';
import { CrossVictimView } from './components/CrossVictimView';
import { DocumentsView } from './components/DocumentsView';
import { DatasetView } from './components/DatasetView';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ACC_VIC_P4001');
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [datasetId, setDatasetId] = useState<string | undefined>(undefined);

  // Check backend health periodically
  useEffect(() => {
    const check = async () => {
      try {
        const h = await api.checkHealth();
        setBackendOnline(h.status === 'ok');
        const ds = await api.getDatasetStatus().catch(() => null);
        if (ds) setDatasetId(ds.dataset_id);
      } catch {
        setBackendOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectAccount = (acc: string) => {
    setSelectedAccountId(acc);
    setActiveTab('investigate');
  };

  return (
    <div className="flex h-screen bg-surface font-body-md text-on-surface antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendOnline={backendOnline}
      />

      {/* Main Content Pane */}
      <div className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        {/* Sticky Header */}
        <Header
          caseReference="CASE-2024-089A"
          datasetId={datasetId}
          backendOnline={backendOnline}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto px-7 py-6">
          {activeTab === 'overview' && (
            <OverviewDashboard onSelectAccount={handleSelectAccount} />
          )}

          {(activeTab === 'investigate' || activeTab === 'money-trails' || activeTab === 'risk' || activeTab === 'transactions') && (
            <InvestigateWorkspace initialAccountId={selectedAccountId} />
          )}

          {activeTab === 'recovery' && (
            <RecoveryView onInvestigateAccount={handleSelectAccount} />
          )}

          {activeTab === 'syndicate' && (
            <CrossVictimView onInvestigateAccount={handleSelectAccount} />
          )}

          {(activeTab === 'documents' || activeTab === 'evidence') && (
            <DocumentsView />
          )}

          {activeTab === 'dataset' && (
            <DatasetView />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
