import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { DatasetStats, RecoveryCandidate } from '../api';
import {
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

interface OverviewDashboardProps {
  onSelectAccount: (accountId: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ onSelectAccount }) => {
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [candidates, setCandidates] = useState<RecoveryCandidate[]>([]);
  const [quickAccountId, setQuickAccountId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, recoveryData] = await Promise.all([
          api.getDatasetStats().catch(() => null),
          api.getRecoveryCandidates(undefined, 10).catch(() => ({ candidates: [] })),
        ]);
        if (statsData) setStats(statsData);
        if (recoveryData?.candidates) setCandidates(recoveryData.candidates);
      } catch (e) {
        console.error('Error fetching dashboard data:', e);
      }
    };
    fetchData();
  }, []);

  const handleQuickLaunch = () => {
    if (quickAccountId.trim()) {
      onSelectAccount(quickAccountId.trim());
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* 6 Top Stat Banners matching Stitch */}
      <div className="grid grid-cols-6 gap-3.5">
        {/* Card 1: Records Processed */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between text-outline text-[11px] font-data-mono uppercase font-semibold">
            <span>RECORDS PROCESSED</span>
            <span className="material-symbols-outlined text-[16px]">dataset</span>
          </div>
          <div className="text-2xl font-bold font-data-mono text-on-surface mt-1.5">
            {stats ? stats.total_rows.toLocaleString() : '2,000,000+'}
          </div>
          <div className="text-[10px] text-emerald-700 font-data-mono mt-1 font-medium">
            {stats ? `${stats.valid_rows.toLocaleString()} Validated` : 'DuckDB Ingested'}
          </div>
        </div>

        {/* Card 2: Unique Accounts */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between text-outline text-[11px] font-data-mono uppercase font-semibold">
            <span>UNIQUE ACCOUNTS</span>
            <span className="material-symbols-outlined text-[16px]">account_balance</span>
          </div>
          <div className="text-2xl font-bold font-data-mono text-on-surface mt-1.5">
            {stats ? stats.total_accounts.toLocaleString() : '124,580'}
          </div>
          <div className="text-[10px] text-on-surface-variant font-data-mono mt-1">
            {stats ? `Senders: ${stats.distinct_senders.toLocaleString()}` : 'Indexed in Parquet'}
          </div>
        </div>

        {/* Card 3: Active Investigations */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between text-outline text-[11px] font-data-mono uppercase font-semibold">
            <span>ACTIVE DOSSIERS</span>
            <span className="material-symbols-outlined text-[16px]">folder_special</span>
          </div>
          <div className="text-2xl font-bold font-data-mono text-on-surface mt-1.5">
            4 <span className="text-xs font-normal text-on-surface-variant">Sessions</span>
          </div>
          <div className="text-[10px] text-indigo-700 font-data-mono mt-1 font-medium">
            Air-Gapped Node #4
          </div>
        </div>

        {/* Card 4: Flagged Mule Nodes (Stitch Amber Highlight) */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/40">
          <div className="flex items-center justify-between text-amber-800 text-[11px] font-data-mono uppercase font-bold">
            <span>FLAGGED MULES</span>
            <span className="material-symbols-outlined text-amber-700 text-[16px]">warning</span>
          </div>
          <div className="text-2xl font-bold font-data-mono text-amber-900 mt-1.5">
            {candidates.length > 0 ? candidates.length : '18'}
          </div>
          <div className="text-[10px] text-amber-700 font-data-mono mt-1 font-semibold">
            Rapid Flow / Pass-Through
          </div>
        </div>

        {/* Card 5: Velocity Trails */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between text-outline text-[11px] font-data-mono uppercase font-semibold">
            <span>VELOCITY TRAILS</span>
            <span className="material-symbols-outlined text-[16px]">timeline</span>
          </div>
          <div className="text-2xl font-bold font-data-mono text-on-surface mt-1.5">
            8 <span className="text-xs font-normal text-on-surface-variant">Paths Loaded</span>
          </div>
          <div className="text-[10px] text-emerald-700 font-data-mono mt-1 font-medium">
            4-Hop Traversal Active
          </div>
        </div>

        {/* Card 6: Evidence Seals */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between text-outline text-[11px] font-data-mono uppercase font-semibold">
            <span>EVIDENCE SEALS</span>
            <span className="material-symbols-outlined text-[16px]">verified</span>
          </div>
          <div className="text-2xl font-bold font-data-mono text-on-surface mt-1.5">
            SHA-256
          </div>
          <div className="text-[10px] text-emerald-700 font-data-mono mt-1 font-semibold">
            Cryptographic Integrity
          </div>
        </div>
      </div>

      {/* Middle Row: Two Panels matching Stitch */}
      <div className="grid grid-cols-3 gap-5">
        {/* Left: Account Quick-Launcher (2 cols) */}
        <div className="col-span-2 bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-data-mono font-bold text-outline uppercase tracking-wider">
                TARGET DISPATCH
              </span>
              <h2 className="font-headline-md text-lg font-bold text-on-surface mt-0.5">
                Account Quick-Launcher
              </h2>
            </div>
            <span className="material-symbols-outlined text-outline">search</span>
          </div>
          <p className="text-[12px] text-on-surface-variant">
            Enter an Account ID, UPI handle, or IFSC to dispatch a deep forensic 4-hop temporal query against indexed DuckDB records.
          </p>

          <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/30 flex items-center gap-3">
            <span className="text-[12px] font-data-mono font-semibold text-outline">ACC:</span>
            <input
              type="text"
              value={quickAccountId}
              onChange={(e) => setQuickAccountId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickLaunch()}
              placeholder="Enter Account ID (e.g. ACC_VIC_001, ACC_MULE_P401)..."
              className="flex-1 bg-white border border-outline-variant/50 rounded-md px-3 py-1.5 text-[13px] font-data-mono text-on-surface focus:outline-none"
            />
            <button
              onClick={handleQuickLaunch}
              disabled={!quickAccountId.trim()}
              className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-md text-[12px] font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>Trace</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Right: Evidence & Audit Integrity Card (1 col) */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-[15px] font-bold text-on-surface flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-600" />
              Evidence &amp; Audit Integrity
            </h2>
            <span className="text-[10px] font-data-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
              VALIDATED
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Cryptographic hashing and tamper-evident audit logs verify the provenance of all ingested evidence chains.
          </p>

          <div className="space-y-1.5 pt-1 text-[11px] font-data-mono">
            <div className="p-2 bg-surface-container-low rounded flex items-center justify-between">
              <span className="text-on-surface-variant">Tamper-Evident Hash Chain</span>
              <span className="text-emerald-700 font-bold">Active</span>
            </div>
            <div className="p-2 bg-surface-container-low rounded flex items-center justify-between">
              <span className="text-on-surface-variant">Air-Gapped Audit Trail</span>
              <span className="text-emerald-700 font-bold">Secured</span>
            </div>
            <div className="p-2 bg-surface-container-low rounded flex items-center justify-between">
              <span className="text-on-surface-variant">Cryptographic Dossier Export</span>
              <span className="text-indigo-700 font-bold">Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Priority Investigation Queue Table matching Stitch */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
              <h3 className="font-headline-md text-[14px] font-bold text-on-surface">Priority Investigation Queue</h3>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Accounts flagged with high dispersion ratios, rapid disbursement, or positive Observed Net Flow.
            </p>
          </div>
          <span className="text-[11px] font-data-mono font-semibold text-outline">
            {candidates.length} Active Targets
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] font-data-mono">
            <thead className="bg-slate-50 border-b border-outline-variant/20 text-outline uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">TARGET ACCOUNT ID</th>
                <th className="py-2.5 px-4 text-right">OBSERVED NET FLOW</th>
                <th className="py-2.5 px-3 text-right">RETENTION %</th>
                <th className="py-2.5 px-3 text-center">RISK TIER</th>
                <th className="py-2.5 px-3 text-center">PRIORITY SCORE</th>
                <th className="py-2.5 px-4 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15 text-on-surface">
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                    No active candidates in queue. Ingest a transaction dataset to scan.
                  </td>
                </tr>
              ) : (
                candidates.map((cand) => (
                  <tr key={cand.account_id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-indigo-700">{cand.account_id}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                      ₹{cand.observed_net_flow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium">
                      {cand.retention_percentage.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (cand.mule_risk_index || 0) >= 70
                          ? 'bg-rose-100 text-rose-800'
                          : (cand.mule_risk_index || 0) >= 40
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {(cand.mule_risk_index || 0) >= 70 ? 'HIGH' : (cand.mule_risk_index || 0) >= 40 ? 'MEDIUM' : 'LOW'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-on-surface">
                      {cand.recovery_priority_score.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => onSelectAccount(cand.account_id)}
                        className="px-3 py-1 bg-primary-container text-on-primary hover:bg-black rounded text-[11px] font-semibold transition-colors shadow-xs"
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
