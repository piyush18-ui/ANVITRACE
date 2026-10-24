import React, { useState, useEffect } from 'react';
import { api } from './api';
import { Sidebar } from './components/Sidebar';
import type { ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { InvestigateWorkspace } from './components/InvestigateWorkspace';
import { CaseManagementView } from './components/CaseManagementView';
import { DocumentsView } from './components/DocumentsView';
import { DatasetView } from './components/DatasetView';
import { LandingPage } from './landing/components/LandingPage';
import { AuthModal, DUMMY_OFFICERS } from './components/AuthModal';
import type { OfficerProfile } from './components/AuthModal';

interface NavigationState {
  tab: ActiveTab;
  accountId: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Forensics UI Boundary Caught Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white border border-rose-200 rounded-2xl shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-base font-bold text-slate-900">Workspace Recovery Required</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {this.state.error?.message || 'An unexpected rendering condition occurred.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                try { localStorage.removeItem('anvitrace_cases'); } catch {}
                window.location.hash = '#cases';
                window.location.reload();
              }}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              Reset Evidence Cache &amp; Reload
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.hash = '#cases';
              }}
              className="px-4 py-2 bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer"
            >
              Return to Cases
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const getInitialState = (): { isLanding: boolean; tab: ActiveTab; accountId: string } => {
  const hasOfficer = typeof window !== 'undefined' && Boolean(localStorage.getItem('anvitrace_officer'));
  if (typeof window !== 'undefined' && window.location.hash) {
    const hash = window.location.hash.replace('#', '');
    const [tab, acc] = hash.split('/');
    if (tab === 'overview' || tab === 'app' || tab === 'cases') {
      return { isLanding: false, tab: 'cases', accountId: acc || '' };
    }
    if (['investigate', 'documents', 'dataset-status'].includes(tab)) {
      return { isLanding: false, tab: tab as ActiveTab, accountId: acc || '' };
    }
    if (tab === 'landing') {
      return hasOfficer
        ? { isLanding: false, tab: 'cases', accountId: '' }
        : { isLanding: true, tab: 'cases', accountId: '' };
    }
  }
  return hasOfficer
    ? { isLanding: false, tab: 'cases', accountId: '' }
    : { isLanding: true, tab: 'cases', accountId: '' };
};

export const App: React.FC = () => {
  const initial = getInitialState();
  const [isLanding, setIsLanding] = useState<boolean>(initial.isLanding);
  const [activeTab, setActiveTab] = useState<ActiveTab>(initial.tab);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initial.accountId);
  const [historyStack, setHistoryStack] = useState<NavigationState[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [datasetId, setDatasetId] = useState<string | undefined>(undefined);
  const [selectedDocType, setSelectedDocType] = useState<'freeze_requisition' | 'case_diary'>('freeze_requisition');

  // Authentication State
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [officer, setOfficer] = useState<OfficerProfile | null>(() => {
    try {
      const saved = localStorage.getItem('anvitrace_officer');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  // Sync with browser back/forward buttons (popstate) and hash changes
  useEffect(() => {
    const checkIsAuth = () => {
      try {
        return Boolean(localStorage.getItem('anvitrace_officer'));
      } catch {
        return false;
      }
    };

    const handleUrlHash = () => {
      const isAuth = checkIsAuth();
      if (window.location.hash) {
        const hash = window.location.hash.replace('#', '');
        const [tab, acc] = hash.split('/');
        if (tab === 'landing' || !tab) {
          if (isAuth) {
            // When authenticated, NEVER fall back to landing page via URL or back button
            setIsLanding(false);
            setActiveTab('cases');
            setSelectedAccountId('');
            if (window.location.hash !== '#cases') {
              window.history.replaceState({ isLanding: false, tab: 'cases', accountId: '' }, '', '#cases');
            }
          } else {
            setIsLanding(true);
          }
        } else if (tab === 'app' || tab === 'overview') {
          setIsLanding(false);
          setActiveTab('cases');
          setSelectedAccountId(acc || '');
          window.history.replaceState({ isLanding: false, tab: 'cases', accountId: acc || '' }, '', '#cases');
        } else if (['cases', 'investigate', 'documents', 'dataset-status'].includes(tab)) {
          setIsLanding(false);
          setActiveTab(tab as ActiveTab);
          setSelectedAccountId(acc || '');
        }
      } else {
        if (isAuth) {
          setIsLanding(false);
          setActiveTab('cases');
          setSelectedAccountId('');
          window.history.replaceState({ isLanding: false, tab: 'cases', accountId: '' }, '', '#cases');
        } else {
          setIsLanding(true);
        }
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      const isAuth = checkIsAuth();
      if (isAuth) {
        // Prevent browser back from exiting to landing or external browser history
        if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#landing' || (e.state && e.state.isLanding)) {
          setIsLanding(false);
          setActiveTab('cases');
          setSelectedAccountId('');
          setHistoryStack([]);
          window.history.pushState({ isLanding: false, tab: 'cases', accountId: '' }, '', '#cases');
          return;
        }

        if (e.state && typeof e.state.isLanding === 'boolean' && !e.state.isLanding) {
          setIsLanding(false);
          if (e.state.tab) setActiveTab(e.state.tab === 'overview' ? 'cases' : e.state.tab);
          if (e.state.accountId !== undefined) setSelectedAccountId(e.state.accountId);
          setHistoryStack((prev) => (prev.length > 0 ? prev.slice(0, -1) : []));
          return;
        }
      }

      handleUrlHash();
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleUrlHash);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleUrlHash);
    };
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
  }, [historyStack, activeTab, selectedAccountId, isLanding]);

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

  const handleLaunchInvestigation = () => {
    // Open authentication modal with 3 dummy profiles right after launch button click
    setIsAuthOpen(true);
  };

  const handleAuthenticated = (selectedOfficer: OfficerProfile) => {
    setOfficer(selectedOfficer);
    try {
      localStorage.setItem('anvitrace_officer', JSON.stringify(selectedOfficer));
    } catch {}
    setIsAuthOpen(false);
    setIsLanding(false);
    setActiveTab('cases');
    setSelectedAccountId('');
    setHistoryStack([]);
    if (typeof window !== 'undefined') {
      window.history.replaceState({ isLanding: false, tab: 'cases', accountId: '' }, '', '#cases');
      window.history.pushState({ isLanding: false, tab: 'cases', accountId: '' }, '', '#cases');
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('anvitrace_officer');
    } catch {}
    setOfficer(null);
    setIsLanding(true);
    setSelectedAccountId('');
    setHistoryStack([]);
    if (typeof window !== 'undefined') {
      window.history.replaceState({ isLanding: true }, '', '#landing');
    }
  };

  const handleNavigateToLanding = () => {
    setIsLanding(true);
    if (typeof window !== 'undefined') {
      window.history.pushState({ isLanding: true }, '', '#landing');
    }
  };

  const navigateTo = (tab: ActiveTab, accountId: string = '', addToHistory: boolean = true) => {
    setIsLanding(false);
    const resolvedTab = tab === 'overview' ? 'cases' : tab;
    if (resolvedTab === activeTab && accountId === selectedAccountId && !isLanding) return;

    if (addToHistory) {
      setHistoryStack((prev) => [
        ...prev,
        { tab: activeTab, accountId: selectedAccountId },
      ]);
      if (typeof window !== 'undefined') {
        const hash = `#${resolvedTab}${accountId ? `/${accountId}` : ''}`;
        window.history.pushState({ isLanding: false, tab: resolvedTab, accountId }, '', hash);
      }
    }

    setActiveTab(resolvedTab);
    setSelectedAccountId(accountId);
  };

  const handleGoBack = () => {
    if (isLanding) return;

    if (historyStack.length > 0) {
      const prev = historyStack[historyStack.length - 1];
      setHistoryStack((stack) => stack.slice(0, -1));
      const targetTab = prev.tab === 'overview' ? 'cases' : prev.tab;
      setActiveTab(targetTab);
      setSelectedAccountId(prev.accountId || '');
      if (typeof window !== 'undefined') {
        const hash = `#${targetTab}${prev.accountId ? `/${prev.accountId}` : ''}`;
        window.history.replaceState({ isLanding: false, tab: targetTab, accountId: prev.accountId }, '', hash);
      }
    } else if (activeTab !== 'cases' || Boolean(selectedAccountId)) {
      // Revert back till Cases & Evidence screen
      setActiveTab('cases');
      setSelectedAccountId('');
      setHistoryStack([]);
      if (typeof window !== 'undefined') {
        window.history.replaceState({ isLanding: false, tab: 'cases', accountId: '' }, '', '#cases');
      }
    }
    // If already on cases with no account and empty history, stop!
    // Never drop back to landing screen or exit to browser history.
  };

  const handleSelectAccount = (acc: string) => {
    navigateTo('investigate', acc);
  };

  const handleNavigateToNotice = (acc: string, docType?: 'freeze_requisition' | 'case_diary') => {
    if (docType) {
      setSelectedDocType(docType);
    }
    navigateTo('documents', acc);
  };

  const handleTabChange = (tab: ActiveTab) => {
    navigateTo(tab, tab === 'investigate' ? selectedAccountId : '');
  };

  const canGoBack = !isLanding && (activeTab !== 'cases' || Boolean(selectedAccountId) || historyStack.length > 0);

  if (isLanding) {
    return (
      <div className="w-full h-screen overflow-y-auto overflow-x-hidden bg-[#fbfbfd]">
        <LandingPage onLaunchInvestigation={handleLaunchInvestigation} />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onAuthenticate={handleAuthenticated}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 antialiased overflow-hidden selection:bg-amber-100 selection:text-amber-900">
      {/* Sidebar Navigation matching user requested 4 core stages */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        backendOnline={backendOnline}
        officer={officer}
        onLogout={handleLogout}
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
          officer={officer}
          onLogout={handleLogout}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto px-8 py-6 bg-slate-50">
          <ErrorBoundary>
            {/* 1. Cases & Evidence: Register Case & Upload Evidence (Root Authenticated View) */}
            {(activeTab === 'cases' || activeTab === 'overview') && (
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

            {/* 4. Bank Freeze Notice & Case Diary Generator: Enter ID -> PDF format */}
            {activeTab === 'documents' && (
              <DocumentsView
                initialAccountId={selectedAccountId}
                initialDocType={selectedDocType}
                onInvestigateAccount={handleSelectAccount}
                onGoBack={handleGoBack}
              />
            )}

            {/* Advanced / Technical Ingestion Diagnostics */}
            {activeTab === 'dataset-status' && (
              <DatasetView onGoBack={handleGoBack} />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Auth Switcher Modal accessible within dashboard */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthenticate={handleAuthenticated}
      />
    </div>
  );
};

export default App;
