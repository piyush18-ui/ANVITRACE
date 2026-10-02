import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { DatasetStats, DatasetStatus, RecoveryCandidate } from '../api';
import {
  Layers,
  Users,
  AlertTriangle,
  ArrowRight,
  Database,
  Search,
  ShieldAlert,
  ArrowUpRight,
  Copy,
  Check,
  Building2,
  TrendingUp,
  FolderPlus,
  RefreshCw,
} from 'lucide-react';

interface OverviewDashboardProps {
  onSelectAccount: (accountId: string) => void;
  onNavigateToNotice: (accountId: string) => void;
  onNavigateToCases: () => void;
  onNavigateToDataset?: () => void;
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
  const [tableSearch, setTableSearch] = useState('');
  const [copiedHash, setCopiedHash] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, statusData, recoveryData] = await Promise.all([
        api.getDatasetStats().catch(() => null),
        api.getDatasetStatus().catch(() => null),
        api.getRecoveryCandidates(undefined, 50).catch(() => ({ candidates: [] })),
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

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickLaunch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (quickAccountId.trim()) {
      onSelectAccount(quickAccountId.trim());
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const formatINR = (val: number, maxDecimals = 2) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: maxDecimals,
      minimumFractionDigits: maxDecimals > 0 ? 2 : 0,
    }).format(val);
  };

  const getBankBadge = (accId: string) => {
    const prefix = accId.slice(0, 4).toUpperCase();
    const bankMap: Record<string, { name: string; color: string }> = {
      SBIN: { name: 'SBI', color: 'bg-sky-50 text-sky-700 border-sky-200' },
      HDFC: { name: 'HDFC', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      ICIC: { name: 'ICICI', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      KKBK: { name: 'KOTAK', color: 'bg-red-50 text-red-700 border-red-200' },
      PUNB: { name: 'PNB', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      BARB: { name: 'BOB', color: 'bg-orange-50 text-orange-700 border-orange-200' },
      AIRP: { name: 'AIRTEL', color: 'bg-rose-50 text-rose-700 border-rose-200' },
      PYTM: { name: 'PAYTM', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
      IPOS: { name: 'IPPB', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      AXIS: { name: 'AXIS', color: 'bg-pink-50 text-pink-700 border-pink-200' },
    };
    return bankMap[prefix] || { name: prefix || 'BANK', color: 'bg-slate-50 text-slate-700 border-slate-200' };
  };

  const filteredCandidates = candidates.filter((c) =>
    c.account_id.toLowerCase().includes(tableSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-28 select-none max-w-7xl mx-auto">
      {/* 4 Sleek Forensic KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ingested Transactions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Ingested Transactions</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight tabular-nums font-['Plus_Jakarta_Sans',sans-serif]">
            {stats ? stats.total_rows.toLocaleString('en-IN') : loading ? '—' : '0'}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-700 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>
              {stats
                ? `${stats.valid_rows.toLocaleString('en-IN')} Verified Records`
                : 'Zero Records Loaded'}
            </span>
          </div>
        </div>

        {/* KPI 2: Unique Accounts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Unique Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight tabular-nums font-['Plus_Jakarta_Sans',sans-serif]">
            {stats ? stats.total_accounts.toLocaleString('en-IN') : loading ? '—' : '0'}
          </div>
          <div className="text-xs text-slate-500 mt-2 font-medium truncate">
            {stats
              ? `${stats.distinct_senders.toLocaleString('en-IN')} Senders • ${stats.distinct_receivers.toLocaleString('en-IN')} Receivers`
              : 'Unique accounts'}
          </div>
        </div>

        {/* KPI 3: Total Transacted Volume */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Transacted Volume</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="text-sm font-bold">₹</span>
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight tabular-nums font-['Plus_Jakarta_Sans',sans-serif] truncate">
            {stats ? (
              <>
                <span className="text-xl font-semibold text-slate-400 mr-1">₹</span>
                {formatINR(stats.total_volume_inr, 0)}
              </>
            ) : loading ? (
              '—'
            ) : (
              '₹ 0'
            )}
          </div>
          <div className="text-xs text-slate-500 mt-2 font-mono truncate">
            {status ? `Hash: ${status.dataset_hash.slice(0, 14)}...` : 'No Dataset Mounted'}
          </div>
        </div>

        {/* KPI 4: Mule Recovery Candidates */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group bg-gradient-to-br from-white via-white to-rose-50/30">
          <div className="flex items-center justify-between text-rose-800 text-xs font-semibold uppercase tracking-wider">
            <span>Mule Candidates</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-700 mt-2 tracking-tight tabular-nums font-['Plus_Jakarta_Sans',sans-serif]">
            {candidates.length}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-700 font-medium">
            <TrendingUp size={13} />
            <span>Retained Unsettled Net Inflow</span>
          </div>
        </div>
      </div>

      {/* Investigator Action Deck: Quick-Launch & Dataset Context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick Launch Omnibar (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                TARGET DISPATCH
              </span>
              <span className="text-xs text-slate-400">4-Hop BFS Traversal</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-2 tracking-tight">
              Investigator Account Quick-Launcher
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Dispatch a deep-dive trace to extract full 4-hop money lineage, risk feature attribution, and generate bank freeze requisitions.
            </p>
          </div>

          <form onSubmit={handleQuickLaunch} className="space-y-3">
            <div className="relative flex items-center">
              <Search size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={quickAccountId}
                onChange={(e) => setQuickAccountId(e.target.value)}
                placeholder="Enter suspect account ID (e.g. SBIN10001486, KKBK10001495)..."
                className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white pl-10 pr-28 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
              <button
                type="submit"
                disabled={!quickAccountId.trim()}
                className="absolute right-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                <span>Investigate</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Quick Preset Chips from Candidates */}
            {candidates.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[11px] text-slate-400 font-medium">Flagged Presets:</span>
                {candidates.slice(0, 4).map((cand) => (
                  <button
                    key={cand.account_id}
                    type="button"
                    onClick={() => {
                      setQuickAccountId(cand.account_id);
                      onSelectAccount(cand.account_id);
                    }}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 text-slate-600 text-[11px] font-mono font-medium border border-slate-200/80 transition-colors"
                  >
                    {cand.account_id}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Active Dataset Mount Telemetry Card (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Database size={15} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Active Evidence Mount</h3>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                status?.status === 'indexed'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {status?.status ? status.status.toUpperCase() : 'NO MOUNT'}
            </span>
          </div>

          {status ? (
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 text-[10px] font-bold uppercase block tracking-wider">
                  SOURCE FILE
                </span>
                <span className="font-semibold text-slate-900 truncate block mt-0.5">
                  {status.filename}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    SHA-256 DIGEST
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(status.dataset_hash)}
                    className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-[10px] transition-colors"
                    title="Copy full cryptographic hash"
                  >
                    {copiedHash ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                    <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <span className="font-mono text-[11px] text-slate-700 block mt-0.5 truncate">
                  {status.dataset_hash}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-500 font-medium space-y-2">
              <p>No active dataset loaded.</p>
              <button
                type="button"
                onClick={onNavigateToCases}
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition-colors"
              >
                Register Case &amp; Ingest
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Status: Ready</span>
            <button
              type="button"
              onClick={fetchData}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium transition-colors"
            >
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Forensic Intelligence Board: Detected Fraudulent Accounts */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Detected Fraudulent &amp; High-Risk Mule Accounts</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold font-mono">
                  {filteredCandidates.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Priority ranked by anomalous fan-in inflow and positive retained fund balances
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search within table */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Filter by account ID..."
                className="pl-7 pr-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Table Content - Vertically and horizontally scrollable with sticky header */}
        <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
          <table className="w-full text-left text-xs font-medium">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold sticky top-0 z-10 shadow-xs">
              <tr>
                <th className="py-3 px-6">Suspect Account</th>
                <th className="py-3 px-4 text-right">Total Inflow</th>
                <th className="py-3 px-4 text-right">Total Outflow</th>
                <th className="py-3 px-4 text-right">Observed Net Flow</th>
                <th className="py-3 px-4 text-center">Retention</th>
                <th className="py-3 px-4 text-center">Mule Risk Score</th>
                <th className="py-3 px-6 text-center">Investigation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {loading ? 'Analyzing transactions...' : 'No suspicious accounts found'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {loading
                            ? 'Scanning graph for Layer 1 collectors and pass-through nodes...'
                            : 'Upload a 2M+ transaction evidence CSV inside a case docket to begin.'}
                        </p>
                      </div>
                      {!loading && (
                        <button
                          type="button"
                          onClick={onNavigateToCases}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5"
                        >
                          <FolderPlus size={14} />
                          <span>Register Case &amp; Ingest CSV</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand) => {
                  const bank = getBankBadge(cand.account_id);
                  const isHighRisk = cand.mule_risk_index >= 70;
                  const isMediumRisk = cand.mule_risk_index >= 30;

                  return (
                    <tr
                      key={cand.account_id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Suspect Account & Bank Institution */}
                      <td className="py-3 px-6 font-semibold">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${bank.color}`}
                          >
                            {bank.name}
                          </span>
                          <span className="font-mono text-slate-900 font-bold group-hover:text-amber-700 transition-colors">
                            {cand.account_id}
                          </span>
                        </div>
                      </td>

                      {/* Total Inflow */}
                      <td className="py-3 px-4 text-right tabular-nums font-mono text-slate-800">
                        <span className="text-[11px] text-slate-400 mr-0.5">₹</span>
                        {formatINR(cand.total_incoming_amount)}
                      </td>

                      {/* Total Outflow */}
                      <td className="py-3 px-4 text-right tabular-nums font-mono text-slate-500">
                        <span className="text-[11px] text-slate-400 mr-0.5">₹</span>
                        {formatINR(cand.total_outgoing_amount)}
                      </td>

                      {/* Observed Net Flow */}
                      <td className="py-3 px-4 text-right tabular-nums font-mono font-bold text-emerald-700">
                        <span className="text-[11px] text-emerald-500 mr-0.5">₹</span>
                        {formatINR(cand.observed_net_flow)}
                      </td>

                      {/* Retention Percentage with visual indicator */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-slate-700">
                            {cand.retention_percentage.toFixed(1)}%
                          </span>
                          <div className="w-10 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(100, cand.retention_percentage)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Mule Risk Score */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                            isHighRisk
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isMediumRisk
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isHighRisk ? 'bg-rose-500' : isMediumRisk ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          {cand.mule_risk_index.toFixed(1)} / 100
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-6 text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectAccount(cand.account_id)}
                            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="Deep-dive into transaction graph and risk breakdown"
                          >
                            <span>Deep-Dive</span>
                            <ArrowUpRight size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigateToNotice(cand.account_id)}
                            className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            title="Generate Sec. 102 CrPC Bank Debit Freeze Notice"
                          >
                            <ShieldAlert size={12} />
                            <span>Freeze Notice</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Count & Scroll Helper */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Showing <strong className="text-slate-800 font-bold">{filteredCandidates.length}</strong> high-risk mule candidates
          </span>
          <span className="text-[11px] text-slate-400">
            Scroll table or whole page to explore all candidates
          </span>
        </div>
      </div>
    </div>
  );
};
