import React, { useState, useEffect } from 'react';
import { api } from './api';
import { Sidebar } from './components/Sidebar';
import type { ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewDashboard } from './components/OverviewDashboard';
import { InvestigateWorkspace } from './components/InvestigateWorkspace';
import { CaseManagementView } from './components/CaseManagementView';
import { DocumentsView } from './components/DocumentsView';
import { DatasetView } from './components/DatasetView';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
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

  const handleNavigateToNotice = (acc: string) => {
    setSelectedAccountId(acc);
    setActiveTab('documents');
  };

  return (
    <div className="flex h-screen bg-surface font-body-md text-on-surface antialiased overflow-hidden">
      {/* Sidebar Navigation matching user requested 4 core stages */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendOnline={backendOnline}
      />

      {/* Main Content Pane */}
      <div className="flex-1 ml-72 flex flex-col h-screen overflow-hidden">
        {/* Sticky Header */}
        <Header
          caseReference={datasetId ? `DATASET: ${datasetId.slice(0, 10)}` : 'AIR-GAP FORENSICS'}
          datasetId={datasetId}
          backendOnline={backendOnline}
          onSearchTarget={handleSelectAccount}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          {/* 1. Dashboard: Fraudulent accounts board & system overview */}
          {activeTab === 'overview' && (
            <OverviewDashboard
              onSelectAccount={handleSelectAccount}
              onNavigateToNotice={handleNavigateToNotice}
              onNavigateToCases={() => setActiveTab('cases')}
              onNavigateToDataset={() => setActiveTab('dataset-status')}
            />
          )}

          {/* 2. Create Case & Upload Evidence (persistent across refresh) */}
          {activeTab === 'cases' && (
            <CaseManagementView
              onInvestigateAccount={handleSelectAccount}
              onNavigateToNotice={handleNavigateToNotice}
              onNavigateToDataset={() => setActiveTab('dataset-status')}
              onNavigateToDocuments={() => setActiveTab('documents')}
            />
          )}

          {/* 3. Account Deep-Dive: Search ID, Risk Score & Breakdown, Inflow/Outflow Lineage, SHA-256 Check */}
          {activeTab === 'investigate' && (
            <InvestigateWorkspace
              initialAccountId={selectedAccountId}
              onNavigateToNotice={handleNavigateToNotice}
            />
          )}

          {/* 4. Bank Freeze Notice Generator: Enter ID -> Section 102 CrPC PDF format */}
          {activeTab === 'documents' && (
            <DocumentsView
              initialAccountId={selectedAccountId}
              onInvestigateAccount={handleSelectAccount}
            />
          )}

          {/* Advanced / Technical Ingestion Diagnostics */}
          {activeTab === 'dataset-status' && (
            <DatasetView />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
