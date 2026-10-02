import React from 'react';

export type ActiveTab =
  | 'overview'
  | 'cases'
  | 'investigate'
  | 'documents';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  backendOnline: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, backendOnline }) => {
  const navItems: Array<{ id: ActiveTab; label: string; icon: string; description: string }> = [
    { id: 'overview', label: 'Dashboard', icon: 'dashboard', description: 'Fraudulent accounts & telemetry' },
    { id: 'cases', label: 'Cases & Evidence', icon: 'folder_open', description: 'Register case & upload CSV' },
    { id: 'investigate', label: 'Account Deep-Dive', icon: 'manage_search', description: 'Search ID, score & lineage' },
    { id: 'documents', label: 'Bank Freeze Notices', icon: 'gavel', description: 'Sec. 102 CrPC notice generator' },
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
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-xs transition-colors text-left ${
                  isActive
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[19px] mt-0.5">{item.icon}</span>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-lg text-xs font-bold leading-tight">{item.label}</span>
                  <span className={`text-[10px] truncate leading-tight mt-0.5 ${isActive ? 'text-on-primary/80' : 'text-outline'}`}>
                    {item.description}
                  </span>
                </div>
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
