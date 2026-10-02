import React, { useState } from 'react';
import {
  Search,
  Database,
  UserCheck,
  ChevronRight,
  Terminal,
  ArrowLeft,
  LogOut,
} from 'lucide-react';

import type { OfficerProfile } from './AuthModal';

interface HeaderProps {
  caseReference?: string;
  datasetId?: string;
  backendOnline?: boolean;
  onSearchTarget?: (target: string) => void;
  canGoBack?: boolean;
  onGoBack?: () => void;
  backLabel?: string;
  officer?: OfficerProfile | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  caseReference = 'ACTIVE SESSION',
  datasetId,
  backendOnline: _backendOnline,
  onSearchTarget,
  canGoBack,
  onGoBack,
  backLabel = 'Back',
  officer,
  onLogout,
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && onSearchTarget) {
      onSearchTarget(query.trim());
      setQuery('');
    }
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md z-40 flex items-center justify-between px-6 border-b border-slate-200 select-none sticky top-0 shrink-0 shadow-xs">
      {/* Left: Direct Back Action & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {(canGoBack ?? true) && onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 hover:text-slate-950 text-xs font-bold border border-slate-300/80 transition-all shadow-2xs cursor-pointer group shrink-0"
            title="Go back to previous screen (Browser Back / Alt+Left)"
            id="nav-back-button"
          >
            <ArrowLeft size={14} className="text-slate-700 group-hover:text-slate-950 group-hover:-translate-x-0.5 transition-transform" />
            <span>{backLabel}</span>
          </button>
        )}

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-2 font-bold text-slate-900 tracking-tight">
            <img src="/anvitrace-icon.png" alt="ANVITRACE" className="w-5 h-5 rounded object-contain shadow-2xs shrink-0" />
            ANVITRACE
          </span>
          <ChevronRight size={13} className="text-slate-400" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[11px] font-semibold">
            <Database size={11} className="text-slate-500" />
            <span>{caseReference}</span>
          </div>
        </div>
      </div>

      {/* Center: Command Palette Query Input */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-md mx-6">
        <div className="relative flex items-center">
          <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
          <input
            className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white pl-9 pr-14 py-2 rounded-lg text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 border border-slate-200 transition-all font-mono"
            placeholder="Search Account ID to investigate (e.g. SBIN10001486)..."
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="absolute right-1.5 px-2 py-1 rounded bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-[10px] font-semibold font-mono tracking-wider transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            Enter ↵
          </button>
        </div>
      </form>

      {/* Right: System Telemetry & Officer Session */}
      <div className="flex items-center gap-4">
        {datasetId && (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-mono">
            <span className="text-slate-400">DS:</span>
            <span className="font-semibold text-slate-800 truncate max-w-[100px]">
              {datasetId.slice(0, 12)}
            </span>
          </div>
        )}

        <div className="h-5 w-px bg-slate-200 hidden md:block" />

        {/* Authorized Investigator Session Badge & Logout */}
        <div className="flex items-center gap-3 pl-1">
          <div className="flex items-center gap-2.5">
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-900 leading-tight font-bold tracking-tight">
                {officer ? officer.name : 'Investigator Console'}
              </span>
              <span className="text-[10px] text-amber-600 leading-tight font-semibold tracking-wide uppercase">
                {officer ? `BADGE #${officer.badge}` : 'Authenticated Session'}
              </span>
            </div>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ring-1 ring-slate-800 shadow-xs ${
                officer ? officer.themeColor : 'bg-slate-900 text-amber-400'
              }`}
            >
              {officer ? officer.initials : <UserCheck size={16} className="text-amber-400" />}
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 text-xs font-bold transition-all cursor-pointer shadow-2xs group shrink-0"
              title="Log out and return to landing page"
              id="header-logout-btn"
            >
              <LogOut size={13} className="text-slate-400 group-hover:text-red-600 transition-colors" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
