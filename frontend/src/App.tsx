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

export interface HistoryItem {
  tab: ActiveTab;
  accountId?: string;
  label: string;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [datasetId, setDatasetId] = useState<string | undefined>(undefined);

  // Navigation History Stack
  const [historyStack, setHistoryStack] = useState<HistoryItem[]>([
    { tab: 'overview', label: 'Dashboard' },
  ]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

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

  const getTabLabel = (tab: ActiveTab, accountId?: string): string => {
    switch (tab) {
      case 'overview':
        return 'Dashboard';
      case 'cases':
        return 'Cases & Evidence';
      case 'investigate':
        return accountId ? `Account ${accountId}` : 'Account Deep-Dive';
      case 'documents':
        return accountId ? `Freeze Notice (${accountId})` : 'Bank Freeze Notices';
      case 'dataset-status':
        return 'Dataset Diagnostics';
      default:
        return 'Dashboard';
    }
  };

  const navigateTo = (tab: ActiveTab, accountId?: string, customLabel?: string) => {
    const label = customLabel || getTabLabel(tab, accountId);
    const current = historyStack[currentIndex];

    // Avoid duplicate history entries for same tab & account
    if (current && current.tab === tab && (current.accountId || '') === (accountId || '')) {
      return;
    }

    const nextStack = historyStack.slice(0, currentIndex + 1);
    nextStack.push({ tab, accountId, label });

    setHistoryStack(nextStack);
    setCurrentIndex(nextStack.length - 1);
    setActiveTab(tab);
    setSelectedAccountId(accountId || '');

    // Sync with browser history API so native back/forward also works smoothly
    try {
      window.history.pushState(
        { tab, accountId, label, index: nextStack.length - 1 },
        '',
        `#${tab}${accountId ? `?account=${accountId}` : ''}`
      );
    } catch { }
  };

  const handleGoBack = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevItem = historyStack[prevIndex];
      setCurrentIndex(prevIndex);
      setActiveTab(prevItem.tab);
      setSelectedAccountId(prevItem.accountId || '');
    } else if (activeTab !== 'overview') {
      setActiveTab('overview');
      setSelectedAccountId('');
      setHistoryStack([{ tab: 'overview', label: 'Dashboard' }]);
      setCurrentIndex(0);
    }
  };

  // Browser popstate listener (back/forward mouse buttons / browser arrows)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
        setSelectedAccountId(event.state.accountId || '');
        if (typeof event.state.index === 'number') {
          setCurrentIndex(event.state.index);
        }
      } else if (currentIndex > 0) {
        handleGoBack();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentIndex, historyStack]);

  const canGoBack = currentIndex > 0 || activeTab !== 'overview';
  const previousLabel = currentIndex > 0
    ? historyStack[currentIndex - 1].label
    : (activeTab !== 'overview' ? 'Dashboard' : undefined);

  const handleSelectAccount = (acc: string, label?: string) => {
    navigateTo('investigate', acc, label);
  };

  const handleNavigateToNotice = (acc: string) => {
    navigateTo('documents', acc);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 antialiased overflow-hidden selection:bg-amber-100 selection:text-amber-900">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => navigateTo(tab)}
        backendOnline={backendOnline}
      />

      {/* Main Content Pane */}
      <div className="flex-1 ml-72 flex flex-col h-screen overflow-hidden bg-slate-50">
        {/* Sticky Header with Back Button */}
        <Header
          caseReference={datasetId ? `DATASET: ${datasetId.slice(0, 10)}` : 'AIR-GAP FORENSICS'}
          datasetId={datasetId}
          backendOnline={backendOnline}
          onSearchTarget={handleSelectAccount}
          canGoBack={canGoBack}
          onGoBack={handleGoBack}
          previousLabel={previousLabel}
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
            />
          )}

          {/* 3. Account Deep-Dive: Search ID, Risk Score & Breakdown, Inflow/Outflow Lineage, SHA-256 Check */}
          {activeTab === 'investigate' && (
            <InvestigateWorkspace
              initialAccountId={selectedAccountId}
              onNavigateToNotice={handleNavigateToNotice}
              onSelectAccount={(acc) => handleSelectAccount(acc)}
              onGoBack={handleGoBack}
              previousLabel={previousLabel}
            />
          )}

          {/* 4. Bank Freeze Notice Generator: Enter ID -> Section 102 CrPC PDF format */}
          {activeTab === 'documents' && (
            <DocumentsView
              initialAccountId={selectedAccountId}
              onInvestigateAccount={handleSelectAccount}
              onGoBack={handleGoBack}
              previousLabel={previousLabel}
            />
          )}

          {/* Advanced / Technical Ingestion Diagnostics */}
          {activeTab === 'dataset-status' && (
            <DatasetView
              onGoBack={handleGoBack}
              previousLabel={previousLabel}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
