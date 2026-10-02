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

interface NavigationState {
  tab: ActiveTab;
  accountId: string;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [historyStack, setHistoryStack] = useState<NavigationState[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [datasetId, setDatasetId] = useState<string | undefined>(undefined);

  // Sync with browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.tab) {
        setActiveTab(e.state.tab);
        setSelectedAccountId(e.state.accountId || '');
        setHistoryStack((prev) => (prev.length > 0 ? prev.slice(0, -1) : []));
      } else if (window.location.hash) {
        const hash = window.location.hash.replace('#', '');
        const [tab, acc] = hash.split('/');
        if (['overview', 'cases', 'investigate', 'documents', 'dataset-status'].includes(tab)) {
          setActiveTab(tab as ActiveTab);
          setSelectedAccountId(acc || '');
        }
      } else {
        setActiveTab('overview');
        setSelectedAccountId('');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Alt + ArrowLeft keyboard shortcut for going back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        const target = e.target as HTMLElement;
        const isInput = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
        if (!isInput) {
          e.preventDefault();
          handleGoBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStack, activeTab, selectedAccountId]);

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

  const navigateTo = (tab: ActiveTab, accountId: string = '', addToHistory: boolean = true) => {
    if (tab === activeTab && accountId === selectedAccountId) return;

    if (addToHistory) {
      setHistoryStack((prev) => [
        ...prev,
        { tab: activeTab, accountId: selectedAccountId },
      ]);
      if (typeof window !== 'undefined') {
        const hash = `#${tab}${accountId ? `/${accountId}` : ''}`;
        window.history.pushState({ tab, accountId }, '', hash);
      }
    }

    setActiveTab(tab);
    setSelectedAccountId(accountId);
  };

  const handleGoBack = () => {
    if (historyStack.length > 0) {
      const prev = historyStack[historyStack.length - 1];
      setHistoryStack((stack) => stack.slice(0, -1));
      setActiveTab(prev.tab);
      setSelectedAccountId(prev.accountId || '');
      if (typeof window !== 'undefined') {
        const hash = `#${prev.tab}${prev.accountId ? `/${prev.accountId}` : ''}`;
        window.history.replaceState({ tab: prev.tab, accountId: prev.accountId }, '', hash);
      }
    } else if (activeTab !== 'overview') {
      setActiveTab('overview');
      setSelectedAccountId('');
      if (typeof window !== 'undefined') {
        window.history.replaceState({ tab: 'overview', accountId: '' }, '', '#overview');
      }
    }
  };

  const handleSelectAccount = (acc: string) => {
    navigateTo('investigate', acc);
  };

  const handleNavigateToNotice = (acc: string) => {
    navigateTo('documents', acc);
  };

  const handleTabChange = (tab: ActiveTab) => {
    navigateTo(tab, tab === 'investigate' ? selectedAccountId : '');
  };

  const canGoBack = historyStack.length > 0 || activeTab !== 'overview';

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 antialiased overflow-hidden selection:bg-amber-100 selection:text-amber-900">
      {/* Sidebar Navigation matching user requested 4 core stages */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        backendOnline={backendOnline}
      />

      {/* Main Content Pane */}
      <div className="flex-1 ml-72 flex flex-col h-screen overflow-hidden bg-slate-50">
        {/* Sticky Header */}
        <Header
          caseReference={datasetId ? `DATASET: ${datasetId.slice(0, 10)}` : 'AIR-GAP FORENSICS'}
          datasetId={datasetId}
          backendOnline={backendOnline}
          onSearchTarget={handleSelectAccount}
          canGoBack={canGoBack}
          onGoBack={handleGoBack}
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
              onAccountChange={(newAcc) => {
                if (newAcc !== selectedAccountId) {
                  navigateTo('investigate', newAcc);
                }
              }}
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
            <DatasetView onGoBack={handleGoBack} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
