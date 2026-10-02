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

interface NavHistoryItem {
  tab: ActiveTab;
  accountId: string;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [datasetId, setDatasetId] = useState<string | undefined>(undefined);
  const [historyStack, setHistoryStack] = useState<NavHistoryItem[]>([]);

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

  const navigateTo = (tab: ActiveTab, accountId?: string) => {
    setHistoryStack((prev) => [
      ...prev,
      { tab: activeTab, accountId: selectedAccountId },
    ]);
    if (accountId !== undefined) {
      setSelectedAccountId(accountId);
    }
    setActiveTab(tab);
  };

  const handleSelectAccount = (acc: string) => {
    navigateTo('investigate', acc);
  };

  const handleNavigateToNotice = (acc: string) => {
    navigateTo('documents', acc);
  };

  const handleSidebarTabChange = (newTab: ActiveTab) => {
    if (newTab !== activeTab) {
      navigateTo(newTab, selectedAccountId);
    }
  };

  const handleGoBack = () => {
    if (historyStack.length > 0) {
      const prev = historyStack[historyStack.length - 1];
      setHistoryStack((stack) => stack.slice(0, -1));
      setActiveTab(prev.tab);
      setSelectedAccountId(prev.accountId || '');
    } else {
      setActiveTab('overview');
    }
  };

  // Keyboard shortcut listener: Alt + ArrowLeft
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStack, activeTab, selectedAccountId]);

  const canGoBack = historyStack.length > 0 || activeTab !== 'overview';

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 antialiased overflow-hidden selection:bg-amber-100 selection:text-amber-900">
      {/* Sidebar Navigation matching user requested 4 core stages */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSidebarTabChange}
        backendOnline={backendOnline}
      />

      {/* Main Content Pane */}
      <div className="flex-1 ml-72 flex flex-col h-screen overflow-hidden bg-slate-50">
        {/* Sticky Header with Universal Back Button */}
        <Header
          caseReference={datasetId ? `DATASET: ${datasetId.slice(0, 10)}` : 'AIR-GAP FORENSICS'}
          datasetId={datasetId}
          backendOnline={backendOnline}
          canGoBack={canGoBack}
          onGoBack={handleGoBack}
          onSearchTarget={handleSelectAccount}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto px-8 py-6 bg-slate-50">
          {/* 1. Dashboard: Fraudulent accounts board & system overview */}
          {activeTab === 'overview' && (
            <OverviewDashboard
              onSelectAccount={handleSelectAccount}
              onNavigateToNotice={handleNavigateToNotice}
              onNavigateToCases={() => navigateTo('cases')}
              onNavigateToDataset={() => navigateTo('dataset-status')}
            />
          )}

          {/* 2. Create Case & Upload Evidence (persistent across refresh) */}
          {activeTab === 'cases' && (
            <CaseManagementView
              onInvestigateAccount={handleSelectAccount}
              onNavigateToNotice={handleNavigateToNotice}
              onNavigateToDataset={() => navigateTo('dataset-status')}
              onNavigateToDocuments={() => navigateTo('documents')}
              onGoBack={handleGoBack}
            />
          )}

          {/* 3. Account Deep-Dive: Search ID, Risk Score & Breakdown, Inflow/Outflow Lineage, SHA-256 Check */}
          {activeTab === 'investigate' && (
            <InvestigateWorkspace
              initialAccountId={selectedAccountId}
              onNavigateToNotice={handleNavigateToNotice}
              onGoBack={handleGoBack}
            />
          )}

          {/* 4. Bank Freeze Notice Generator: Enter ID -> Section 102 CrPC PDF format */}
          {activeTab === 'documents' && (
            <DocumentsView
              initialAccountId={selectedAccountId}
              onInvestigateAccount={handleSelectAccount}
              onGoBack={handleGoBack}
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
