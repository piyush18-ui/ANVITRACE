import React from 'react';

export const SettingsView: React.FC = () => {
  return (
    <div className="flex flex-col w-full space-y-6">
      <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-data-mono-sm text-xs uppercase tracking-wider text-secondary font-semibold">
            SYSTEM PREFERENCES &amp; STATUTORY PARAMETERS
          </span>
          <span className="w-1 h-1 rounded-full bg-outline" />
          <span className="font-data-mono-sm text-xs text-on-surface-variant">Air-Gapped Station #4</span>
        </div>
        <h1 className="font-headline-lg text-2xl font-bold text-on-surface tracking-tight">
          Forensic System Settings
        </h1>
        <p className="font-body-md text-sm text-on-surface-variant mt-1">
          Configure local DuckDB memory ceiling, 4-hop BFS graph traversal boundaries, Indian statutory notice thresholds, and tamper-proof logging keys.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/30 space-y-4">
          <h3 className="font-headline-md text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">tune</span>
            Graph &amp; Lineage Heuristics
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
              <div>
                <div className="font-semibold text-on-surface">Maximum Hop Depth</div>
                <div className="text-on-surface-variant text-[11px]">Strict 4-hop bounded BFS traversal</div>
              </div>
              <span className="font-data-mono font-bold bg-surface-container px-2.5 py-1 rounded">4 Hops</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
              <div>
                <div className="font-semibold text-on-surface">Pass-Through Time Window</div>
                <div className="text-on-surface-variant text-[11px]">Official evaluation interval threshold</div>
              </div>
              <span className="font-data-mono font-bold bg-surface-container px-2.5 py-1 rounded">180 Seconds</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-on-surface">Cycle Detection Indicator</div>
                <div className="text-on-surface-variant text-[11px]">Detect multi-branch return paths</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                Enabled
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/30 space-y-4">
          <h3 className="font-headline-md text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">security</span>
            Air-Gapped &amp; Statutory Security
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
              <div>
                <div className="font-semibold text-on-surface">Network Isolation</div>
                <div className="text-on-surface-variant text-[11px]">Strict zero outbound network telemetry</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold font-data-mono">
                AIR-GAPPED
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
              <div>
                <div className="font-semibold text-on-surface">Cryptographic Proof Standard</div>
                <div className="text-on-surface-variant text-[11px]">Section 65B Indian Evidence Act / BNSS</div>
              </div>
              <span className="font-data-mono font-bold bg-surface-container px-2.5 py-1 rounded">SHA-256</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-on-surface">Local Database Engine</div>
                <div className="text-on-surface-variant text-[11px]">Embedded high-performance OLAP</div>
              </div>
              <span className="font-data-mono font-bold bg-surface-container px-2.5 py-1 rounded">DuckDB v1.1.3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
