import React, { useState } from 'react';
import {
  Search,
  Database,
  UserCheck,
  ChevronRight,
  Terminal,
  ArrowLeft,
} from 'lucide-react';

interface HeaderProps {
  caseReference?: string;
  datasetId?: string;
  backendOnline?: boolean;
  canGoBack?: boolean;
  onGoBack?: () => void;
  onSearchTarget?: (target: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  caseReference = 'ACTIVE SESSION',
  datasetId,
  backendOnline: _backendOnline,
  canGoBack = false,
  onGoBack,
  onSearchTarget,
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
      {/* Left: Back Button & Breadcrumbs & Active Dataset / Case */}
      <div className="flex items-center gap-3">
        {canGoBack && onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 shadow-2xs transition-all cursor-pointer group"
            title="Go back to previous screen (Alt + Left Arrow)"
          >
            <ArrowLeft size={14} className="text-slate-600 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>
        )}
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 font-bold text-slate-900 tracking-tight">
            <Terminal size={15} className="text-amber-500" />
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

        {/* Authorized Investigator Session Badge */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-900 leading-tight font-bold tracking-tight">
              Investigator Console
            </span>
            <span className="text-[10px] text-amber-600 leading-tight font-semibold tracking-wide uppercase">
              Authenticated Session
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs ring-1 ring-slate-800">
            <UserCheck size={16} className="text-amber-400" />
          </div>
        </div>
      </div>
    </header>
  );
};
