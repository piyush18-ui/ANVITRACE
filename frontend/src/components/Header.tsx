import React, { useState } from 'react';

interface HeaderProps {
  caseReference?: string;
  datasetId?: string;
  backendOnline: boolean;
  onSearchTarget?: (target: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  caseReference = 'CASE-2024-089A',
  datasetId,
  backendOnline,
  onSearchTarget,
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && onSearchTarget) {
      onSearchTarget(query.trim());
    }
  };

  return (
    <header className="h-16 bg-surface-container-lowest/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-6 border-b border-outline-variant/30 select-none sticky top-0 shrink-0">
      {/* Left: Brand / Case Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-on-surface-variant font-label-md text-xs">
          <span className="flex items-center gap-1 hover:text-on-surface cursor-pointer font-semibold">
            <span className="material-symbols-outlined text-[16px]">terminal</span>
            ANVITRACE
          </span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="font-data-mono text-xs text-on-surface font-semibold uppercase bg-surface-container px-2 py-0.5 rounded">
            {caseReference}
          </span>
        </div>

        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-surface-container text-on-surface font-data-mono-sm text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-pulse" />
          <span>AIR-GAPPED NODE</span>
        </div>
      </div>

      {/* Center: Command Palette Query Input */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-md mx-6">
        <div className="relative flex items-center">
          <span className="absolute left-2.5 material-symbols-outlined text-[18px] text-on-surface-variant">
            manage_search
          </span>
          <input
            className="w-full bg-surface-container-low pl-9 pr-12 py-1.5 rounded text-on-surface font-data-mono text-xs placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container border border-outline-variant/20 transition-all"
            placeholder="Query target: acc:, hash:, ifsc:, upi:"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="absolute right-2 font-data-mono-sm text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
            ⌘K
          </span>
        </div>
      </form>

      {/* Right: Telemetry & Lead Officer */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-4 text-xs font-data-mono">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="text-on-surface font-medium">Backend: {backendOnline ? 'Online' : 'Offline'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary-container" />
            <span className="text-on-surface font-medium">
              Dataset: {datasetId ? datasetId.slice(0, 10) : 'Indexed'}
            </span>
          </div>
        </div>

        <div className="h-5 w-px bg-outline-variant/30 hidden md:block" />

        {/* Lead Officer Info */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="font-label-md text-xs text-on-surface leading-tight font-semibold">Inv. D. Vance</span>
            <span className="font-data-mono-sm text-[10px] text-secondary leading-tight uppercase font-medium">
              Forensic Lead #408
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
};
