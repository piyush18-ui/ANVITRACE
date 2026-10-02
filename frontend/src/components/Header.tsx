import React from 'react';
import { Database } from 'lucide-react';

interface HeaderProps {
  caseReference?: string;
  datasetId?: string;
  backendOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  caseReference = 'CASE-2024-089A',
  datasetId,
  backendOnline,
}) => {
  return (
    <header className="h-14 bg-surface-container-lowest border-b border-outline-variant/30 flex items-center justify-between px-6 select-none sticky top-0 z-40">
      {/* Left: Case Hierarchy & Air-gap Badge */}
      <div className="flex items-center gap-3 text-[13px]">
        <span className="font-semibold text-on-surface tracking-tight">ANVITRACE</span>
        <span className="text-outline-variant font-bold">&gt;</span>
        <span className="font-data-mono font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded text-[11px]">
          {caseReference}
        </span>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
          AIR-GAPPED NODE #4
        </div>
      </div>

      {/* Right: Operational Status & Investigator Profile */}
      <div className="flex items-center gap-5 text-[12px]">
        <div className="flex items-center gap-4 text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            Backend: <strong className={backendOnline ? 'text-on-surface' : 'text-rose-600'}>{backendOnline ? 'Online' : 'Offline'}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Database size={13} className="text-outline" />
            Dataset: <strong className="text-on-surface font-data-mono text-[11px]">{datasetId ? datasetId.slice(0, 12) : 'Indexed'}</strong>
          </span>
        </div>

        <div className="h-4 w-px bg-outline-variant/40" />

        {/* Lead Officer Profile */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col text-right">
            <span className="text-[12px] font-semibold text-on-surface leading-tight">Inv. D. Vance</span>
            <span className="text-[10px] text-amber-700 font-data-mono font-bold tracking-wide">FORENSIC LEAD #468</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs shadow-sm">
            DV
          </div>
        </div>
      </div>
    </header>
  );
};
