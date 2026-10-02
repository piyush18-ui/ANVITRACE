import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { DatasetStats, DatasetStatus, RecoveryCandidate } from '../api';
import { ArrowRight, Database } from 'lucide-react';

interface OverviewDashboardProps {
  onSelectAccount: (accountId: string) => void;
  onNavigateToNotice: (accountId: string) => void;
  onNavigateToCases: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onSelectAccount,
  onNavigateToNotice,
  onNavigateToCases,
}) => {
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [status, setStatus] = useState<DatasetStatus | null>(null);
  const [candidates, setCandidates] = useState<RecoveryCandidate[]>([]);
  const [quickAccountId, setQuickAccountId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsData, statusData, recoveryData] = await Promise.all([
          api.getDatasetStats().catch(() => null),
          api.getDatasetStatus().catch(() => null),
          api.getRecoveryCandidates(undefined, 25).catch(() => ({ candidates: [] })),
        ]);
        if (statsData) setStats(statsData);
        if (statusData) setStatus(statusData);
        if (recoveryData?.candidates) setCandidates(recoveryData.candidates);
      } catch (e) {
        console.error('Error fetching dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleQuickLaunch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (quickAccountId.trim()) {
      onSelectAccount(quickAccountId.trim());
    }
  };

  const hasData = Boolean(stats && stats.total_rows > 0);

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Real Dataset Telemetry Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingested Transactions */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between text-outline text-[11px] font-data-mono uppercase font-semibold">
            <span>INGESTED TRANSACTIONS</span>
            <span className="material-symbols-outlined text-[18px]">dataset</span>
          </div>
          <div className="text-2xl font-bold font-data-mono text-on-surface mt-1.5">
            {stats ? stats.total_rows.toLocaleString() : loading ? '...' : '0'}
          </div>
          <div className="text-[10px] text-emerald-700 font-data-mono mt-1 font-medium">
            {stats ? `${stats.valid_rows.toLocaleString()} Valid Records` : 'No Dataset Active'}
          </div>
        </div>

        {/* Unique Node Accounts */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between text-outline text-[11px] font-data-mono uppercase font-semibold">
            <span>UNIQUE ACCOUNTS</span>
            <span className="material-symbols-outlined text-[18px]">account_balance</span>
          </div>
          <div className="text-2xl font-bold font-data-mono text-on-surface mt-1.5">
            {stats ? stats.total_accounts.toLocaleString() : loading ? '...' : '0'}
          </div>
          <div className="text-[10px] text-on-surface-variant font-data-mono mt-1">
            {stats ? `Senders: ${stats.distinct_senders.toLocaleString()} • Receivers: ${stats.distinct_receivers.toLocaleString()}` : 'DuckDB Graph Nodes'}
          </div>
        </div>

        {/* Total Transacted Volume */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between text-outline text-[11px] font-data-mono uppercase font-semibold">
            <span>TOTAL VOLUME</span>
            <span className="material-symbols-outlined text-[18px]">currency_rupee</span>
          </div>
          <div className="text-2xl font-bold font-data-mono text-indigo-700 mt-1.5 truncate">
            {stats ? `₹${stats.total_volume_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : loading ? '...' : '₹0'}
          </div>
          <div className="text-[10px] text-on-surface-variant font-data-mono mt-1">
            {status ? `Hash: ${status.dataset_hash.slice(0, 12)}...` : 'Unseeded'}
          </div>
        </div>

        {/* Flagged Recovery Candidates */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/40">
          <div className="flex items-center justify-between text-amber-800 text-[11px] font-data-mono uppercase font-bold">
            <span>RECOVERY CANDIDATES</span>
            <span className="material-symbols-outlined text-amber-700 text-[18px]">warning</span>
          </div>
          <div className="text-2xl font-bold font-data-mono text-amber-900 mt-1.5">
            {candidates.length}
          </div>
          <div className="text-[10px] text-amber-700 font-data-mono mt-1 font-semibold">
            Positive Observed Net Flow
          </div>
        </div>
      </div>

      {/* Account Quick-Launcher & Active Dataset Context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Account Quick-Launcher (2 cols) */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-3">
          <div>
            <span className="text-[10px] font-data-mono font-bold text-outline uppercase tracking-wider">
              TARGET DISPATCH
            </span>
            <h2 className="font-headline-md text-lg font-bold text-on-surface mt-0.5">
              Account Quick-Launcher
            </h2>
            <p className="text-[12px] text-on-surface-variant mt-1">
              Enter any Account ID to initiate a 4-hop temporal graph trace and multi-layer risk assessment.
            </p>
          </div>

          <form onSubmit={handleQuickLaunch} className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 flex items-center gap-3">
            <span className="text-[12px] font-data-mono font-semibold text-outline">ACC:</span>
            <input
              type="text"
              value={quickAccountId}
              onChange={(e) => setQuickAccountId(e.target.value)}
              placeholder="Enter Account ID..."
              className="flex-1 bg-white border border-outline-variant/50 rounded-md px-3 py-1.5 text-[13px] font-data-mono text-on-surface focus:outline-none"
            />
            <button
              type="submit"
              disabled={!quickAccountId.trim()}
              className="px-4 py-1.5 bg-primary-container hover:bg-black text-on-primary rounded-md text-[12px] font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>Investigate</span>
              <ArrowRight size={13} />
            </button>
          </form>
        </div>

        {/* Dataset Status Banner (1 col) */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-[15px] font-bold text-on-surface flex items-center gap-1.5">
              <Database size={16} className="text-secondary" />
              Active Dataset Mount
            </h2>
            <span className={`text-[10px] font-data-mono px-2 py-0.5 rounded font-bold ${
              status?.status === 'indexed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
            }`}>
              {status?.status ? status.status.toUpperCase() : 'NO MOUNT'}
            </span>
          </div>

          {status ? (
            <div className="space-y-2 text-[11px] font-data-mono">
              <div className="p-2 bg-surface-container-low rounded border border-outline-variant/20">
                <span className="text-on-surface-variant block text-[10px]">DATASET ID</span>
                <span className="font-bold text-on-surface truncate block">{status.dataset_id}</span>
              </div>
              <div className="p-2 bg-surface-container-low rounded border border-outline-variant/20">
                <span className="text-on-surface-variant block text-[10px]">SOURCE FILE</span>
                <span className="font-medium text-on-surface truncate block">{status.filename}</span>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center space-y-2">
              <p className="text-xs text-on-surface-variant">No transaction dataset ingested yet.</p>
              <button
                onClick={onNavigateToCases}
                className="px-3 py-1.5 bg-secondary-container hover:bg-secondary text-on-primary text-xs font-semibold rounded shadow-sm"
              >
                Register Case &amp; Ingest CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Flagged Fraudulent / Mule Accounts Board */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
            <h3 className="font-headline-md text-[14px] font-bold text-on-surface">
              Detected Fraudulent &amp; High-Risk Mule Accounts ({candidates.length})
            </h3>
          </div>
          <span className="text-[11px] font-data-mono text-outline">
            Priority Ranked by Suspicious Inflow &amp; Net Retention
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] font-data-mono">
            <thead className="bg-slate-50 border-b border-outline-variant/20 text-outline uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">SUSPECT ACCOUNT</th>
                <th className="py-2.5 px-4 text-right">TOTAL INFLOW</th>
                <th className="py-2.5 px-4 text-right">TOTAL OUTFLOW</th>
                <th className="py-2.5 px-4 text-right">OBSERVED NET FLOW</th>
                <th className="py-2.5 px-3 text-right">RETENTION %</th>
                <th className="py-2.5 px-3 text-center">MULE RISK SCORE</th>
                <th className="py-2.5 px-4 text-center">INVESTIGATION ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15 text-on-surface">
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-on-surface-variant font-data-mono">
                    <div className="space-y-2">
                      <p className="text-xs">
                        {loading ? 'Scanning dataset for fraudulent accounts...' : 'No dataset active. Register a case docket and attach an evidence CSV to begin.'}
                      </p>
                      {onNavigateToCases && (
                        <button
                          type="button"
                          onClick={onNavigateToCases}
                          className="mt-2 px-4 py-1.5 bg-primary-container hover:bg-black text-on-primary rounded text-xs font-semibold shadow-xs"
                        >
                          Register Case &amp; Ingest Evidence CSV →
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                candidates.map((cand) => (
                  <tr key={cand.account_id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-indigo-700">{cand.account_id}</td>
                    <td className="py-2.5 px-4 text-right font-medium">
                      ₹{cand.total_incoming_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right text-on-surface-variant">
                      ₹{cand.total_outgoing_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
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
                        {cand.mule_risk_index !== undefined ? `${cand.mule_risk_index.toFixed(1)} / 100` : 'N/A'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onSelectAccount(cand.account_id)}
                          className="px-2.5 py-1 bg-primary-container text-on-primary hover:bg-black rounded text-[10px] font-semibold transition-colors shadow-xs"
                          title="Deep-dive into account risk and 4-hop lineage"
                        >
                          Deep-Dive
                        </button>
                        <button
                          onClick={() => onNavigateToNotice(cand.account_id)}
                          className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded text-[10px] font-bold transition-colors shadow-xs"
                          title="Generate official Bank Freeze Notice (Sec. 102)"
                        >
                          Freeze Notice
                        </button>
                      </div>
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
