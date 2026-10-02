import React from 'react';
import {
  LayoutDashboard,
  UserSearch,
  GitFork,
  ShieldAlert,
  Coins,
  FileCheck2,
  FileText,
  Database,
} from 'lucide-react';

export type ActiveTab =
  | 'overview'
  | 'investigate'
  | 'transactions'
  | 'money-trails'
  | 'risk'
  | 'recovery'
  | 'syndicate'
  | 'evidence'
  | 'documents'
  | 'dataset';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  backendOnline: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, backendOnline }) => {
  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'investigate', label: 'Investigate', icon: <UserSearch size={18} /> },
    { id: 'money-trails', label: 'Money Trails', icon: <GitFork size={18} /> },
    { id: 'risk', label: 'Risk Analysis', icon: <ShieldAlert size={18} /> },
    { id: 'recovery', label: 'Recovery', icon: <Coins size={18} /> },
    { id: 'syndicate', label: 'Cross-Victim', icon: <UserSearch size={18} /> },
    { id: 'documents', label: 'Legal Documents', icon: <FileText size={18} /> },
    { id: 'evidence', label: 'Evidence Seals', icon: <FileCheck2 size={18} /> },
    { id: 'dataset', label: 'Dataset Status', icon: <Database size={18} /> },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between border-r border-outline-variant/30 select-none">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="p-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-secondary-container text-[22px]">hub</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-md text-[17px] font-bold tracking-tight text-on-surface uppercase">ANVITRACE</span>
              <span className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                Forensics &amp; Audit
              </span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-on-surface-variant font-medium truncate">
            Cyber Forensics &amp; Financial Investigation
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all ${
                  isActive
                    ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Air-Gapped Status Banner */}
      <div className="p-3.5 m-2.5 bg-surface-container-low rounded-lg border border-outline-variant/30 text-[11px] font-data-mono">
        <div className="flex items-center gap-1.5 font-semibold">
          <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-on-surface">LOCAL - OFFLINE</span>
          <span className="ml-auto text-on-surface-variant text-[10px]">v2.1-airgap</span>
        </div>
        <div className="mt-1 text-on-surface-variant text-[10px] flex items-center justify-between">
          <span>FastAPI Engine:</span>
          <span className={backendOnline ? 'text-emerald-700 font-medium' : 'text-rose-600'}>
            {backendOnline ? '127.0.0.1:8000' : 'Disconnected'}
          </span>
        </div>
      </div>
    </aside>
  );
};
