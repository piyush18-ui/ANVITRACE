import React, { useState } from 'react';

interface HeaderProps {
  caseReference?: string;
  datasetId?: string;
  backendOnline: boolean;
  onSearchTarget?: (target: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  caseReference = 'ACTIVE SESSION',
  datasetId,
  backendOnline,
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
    <header className="h-16 bg-surface-container-lowest/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-6 border-b border-outline-variant/30 select-none sticky top-0 shrink-0">
      {/* Left: Brand / Case Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-on-surface-variant font-label-md text-xs">
          <span className="flex items-center gap-1 font-semibold text-on-surface">
            <span className="material-symbols-outlined text-[16px]">terminal</span>
            ANVITRACE
          </span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="font-data-mono text-xs text-on-surface font-semibold uppercase bg-surface-container px-2 py-0.5 rounded">
            {caseReference}
          </span>
        </div>

        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-surface-container text-on-surface font-data-mono-sm text-[11px]">
          <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-secondary-container animate-pulse' : 'bg-rose-500'}`} />
          <span>OFFLINE LOCAL AIR-GAP</span>
        </div>
      </div>

      {/* Center: Command Palette Query Input */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-md mx-6">
        <div className="relative flex items-center">
          <span className="absolute left-2.5 material-symbols-outlined text-[18px] text-on-surface-variant">
            search
          </span>
          <input
            className="w-full bg-surface-container-low pl-9 pr-12 py-1.5 rounded text-on-surface font-data-mono text-xs placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container border border-outline-variant/20 transition-all"
            placeholder="Search Account ID to investigate..."
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            className="absolute right-1 px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[11px] font-data-mono hover:text-on-surface"
          >
            Enter ↵
          </button>
        </div>
      </form>

      {/* Right: Telemetry & Session Auth */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-4 text-xs font-data-mono">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="text-on-surface font-medium">Backend: {backendOnline ? 'Online' : 'Offline'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary-container" />
            <span className="text-on-surface font-medium truncate max-w-[120px]">
              Dataset: {datasetId ? datasetId.slice(0, 10) : 'None'}
            </span>
          </div>
        </div>

        <div className="h-5 w-px bg-outline-variant/30 hidden md:block" />

        {/* Authorized Investigator Session Badge */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="font-label-md text-xs text-on-surface leading-tight font-semibold">Investigator Console</span>
            <span className="font-data-mono-sm text-[10px] text-secondary leading-tight uppercase font-medium">
              Authenticated Session
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined text-[18px]">shield_person</span>
          </div>
        </div>
      </div>
    </header>
  );
};
