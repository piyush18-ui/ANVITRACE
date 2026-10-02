import React from 'react';
import {
  LayoutDashboard,
  FolderArchive,
  ScanSearch,
  FileCheck2,
  ShieldCheck,
  Cpu,
  LogOut,
} from 'lucide-react';
import type { OfficerProfile } from './AuthModal';

export type ActiveTab =
  | 'overview'
  | 'cases'
  | 'investigate'
  | 'documents'
  | 'dataset-status';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  backendOnline?: boolean;
  officer?: OfficerProfile | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  officer,
  onLogout,
}) => {
  const navItems = [
    {
      id: 'overview' as const,
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Fraudulent accounts & telemetry',
    },
    {
      id: 'cases' as const,
      label: 'Cases & Evidence',
      icon: FolderArchive,
      description: 'Register case & upload CSV',
    },
    {
      id: 'investigate' as const,
      label: 'Account Deep-Dive',
      icon: ScanSearch,
      description: 'Search ID, score & lineage',
    },
    {
      id: 'documents' as const,
      label: 'Bank Freeze Notices',
      icon: FileCheck2,
      description: 'Sec. 102 CrPC notice generator',
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-white/95 backdrop-blur-md z-50 flex flex-col justify-between border-r border-slate-200 shadow-[2px_0_12px_rgba(15,23,42,0.03)] select-none">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-md shadow-slate-900/10 ring-1 ring-slate-800">
              <ShieldCheck size={22} className="text-amber-400" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-950 font-['Plus_Jakarta_Sans',sans-serif]">
                  ANVITRACE
                </span>
                <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  v2.0
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Cyber Forensics &amp; Audit
              </span>
            </div>
          </div>
          <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span className="font-medium text-slate-500">Mule Detection Engine</span>
            <span className="font-semibold text-slate-900 flex items-center gap-1">
              <Cpu size={12} className="text-amber-600" /> 4-Hop BFS
            </span>
          </div>
        </div>

        {/* Minimal Navigation */}
        <div className="px-3 pt-4 pb-2">
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            FORENSIC WORKSPACES
          </span>
        </div>

        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white font-medium shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-slate-100'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon size={17} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold tracking-tight leading-tight">
                    {item.label}
                  </span>
                  <span
                    className={`text-[11px] truncate leading-tight mt-0.5 ${
                      isActive ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {item.description}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Officer Session & Sign Out */}
      <div className="p-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
        {officer ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${officer.themeColor}`}
            >
              {officer.initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                {officer.name.split(' ')[0]} {officer.name.split(' ')[1]}
              </span>
              <span className="text-[9px] font-mono text-slate-500 leading-tight">
                #{officer.badge}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 font-medium">Session Active</div>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs group shrink-0"
            title="Log out and return to landing page"
            id="sidebar-logout-button"
          >
            <LogOut size={13} className="text-slate-400 group-hover:text-red-600 transition-colors" />
            <span>Log Out</span>
          </button>
        )}
      </div>
    </aside>
  );
};
