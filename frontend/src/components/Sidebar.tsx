import React from 'react';

export type ActiveTab =
  | 'overview'
  | 'cases'
  | 'dataset-status'
  | 'investigate'
  | 'evidence'
  | 'recovery'
  | 'documents';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  backendOnline: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, backendOnline }) => {
  const navItems: Array<{ id: ActiveTab; label: string; icon: string }> = [
    { id: 'overview', label: 'Dashboard', icon: 'dashboard' },
    { id: 'cases', label: 'Cases', icon: 'verified' },
    { id: 'dataset-status', label: 'Dataset', icon: 'database' },
    { id: 'investigate', label: 'Investigate', icon: 'person_search' },
    { id: 'evidence', label: 'Evidence', icon: 'fingerprint' },
    { id: 'recovery', label: 'Recovery', icon: 'currency_exchange' },
    { id: 'documents', label: 'Documents', icon: 'folder_special' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between border-r border-outline-variant/30 select-none">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="p-5 border-b border-outline-variant/20 bg-surface-container-lowest">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-secondary-container text-[20px]">hub</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-md text-base font-bold tracking-tight text-on-surface uppercase">
                ANVITRACE
              </span>
              <span className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                Forensics &amp; Audit
              </span>
            </div>
          </div>
          <div className="mt-2 text-xs text-on-surface-variant font-medium truncate">
            Cyber Forensics &amp; Financial Investigation
          </div>
        </div>

        {/* Minimal Recommended Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs transition-colors text-left ${
                  isActive
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span className="font-label-lg text-xs">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Air-Gapped Status Banner */}
      <div className="p-3.5 mx-3 mb-3 bg-surface-container-low rounded-lg border border-outline-variant/30 flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-on-surface flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-secondary-container animate-pulse' : 'bg-rose-500'}`} />
            System {backendOnline ? 'Online' : 'Offline'}
          </span>
          <span className="font-data-mono-sm text-[10px] text-on-surface-variant">FastAPI + DuckDB</span>
        </div>
        <div className="flex items-center gap-1 text-on-surface-variant font-data-mono-sm text-[10px] mt-0.5">
          <span className="material-symbols-outlined text-[14px]">lock</span>
          <span>Node: Air-Gapped Offline</span>
        </div>
      </div>
    </aside>
  );
};
