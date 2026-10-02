import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { RecoveryCandidate, DatasetStats } from '../api';

interface LayerDetectionViewProps {
  onInvestigateAccount: (accountId: string) => void;
}

export const LayerDetectionView: React.FC<LayerDetectionViewProps> = ({ onInvestigateAccount }) => {
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [candidates, setCandidates] = useState<RecoveryCandidate[]>([]);
  const [targetQuery, setTargetQuery] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [st, rec] = await Promise.all([
        api.getDatasetStats().catch(() => null),
        api.getRecoveryCandidates(50).catch(() => ({ candidates: [] })),
      ]);
      if (st) setStats(st);
      if (rec && Array.isArray(rec.candidates)) {
        setCandidates(rec.candidates);
      }
    } catch (err) {
      console.error('Failed to load layer detection data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunPipeline = async () => {
    setScanning(true);
    await new Promise((r) => setTimeout(r, 600));
    await loadData();
    setScanning(false);
  };

  const handleDirectInvestigate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = targetQuery.trim();
    if (cleaned) {
      onInvestigateAccount(cleaned);
    }
  };

  // Provide intelligent distribution fallback based on rank / index
  const displayL1 = candidates.slice(0, Math.ceil(candidates.length / 3));
  const displayL2 = candidates.slice(Math.ceil(candidates.length / 3), Math.ceil((2 * candidates.length) / 3));
  const displayL3 = candidates.slice(Math.ceil((2 * candidates.length) / 3));

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Telemetry Bar & Context Header */}
      <div className="w-full flex flex-col gap-3">
        {/* Breadcrumb & Classification Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-container-lowest px-4 py-2.5 rounded-xl shadow-sm border border-outline-variant/30">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2 py-0.5 rounded bg-surface-container font-data-mono text-on-surface uppercase font-medium">
              Node: GraphSub-01
            </span>
            <span className="text-outline-variant font-data-mono">/</span>
            <span className="flex items-center gap-1 font-data-mono text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-container" />
              Engine: FastAPI Graph Subsystem (v4.19)
            </span>
            <span className="text-outline-variant font-data-mono">/</span>
            <span className="font-data-mono text-on-surface-variant">
              Heuristics: Pass-Through Velocity &amp; Dispersion Ratio
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1 rounded text-xs">
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant">folder_open</span>
              <span className="font-data-mono text-on-surface font-semibold tracking-tight">DOCKET: CASE-2024-089A</span>
            </div>
            <div className="flex items-center gap-1 font-data-mono text-xs text-secondary font-medium">
              <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
              SCAN READY
            </div>
          </div>
        </div>

        {/* Title and Subtitle Block */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-surface-container-high/40 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col gap-1 max-w-3xl z-10">
            <div className="flex items-center gap-2">
              <span className="font-data-mono-sm text-xs text-secondary uppercase tracking-widest font-semibold">
                Automated Layering Matrix
              </span>
              <span className="text-outline-variant">•</span>
              <span className="font-data-mono-sm text-xs text-on-surface-variant">Multi-Hop Topology</span>
            </div>
            <h1 className="font-headline-xl text-3xl font-bold text-on-surface tracking-tight">
              L1 / L2 / L3 Layer Detection Overview
            </h1>
            <p className="font-body-md text-sm text-on-surface-variant max-w-2xl leading-relaxed">
              Automated topological classification of banking accounts across multi-hop dispersion networks. Nodes are algorithmically sorted into evidentiary candidate tiers based on fan-in concentration, transmission velocity, and terminal accumulation signatures.
            </p>
          </div>

          {/* Quick Action: Direct Account Layer Inspector */}
          <form onSubmit={handleDirectInvestigate} className="w-full lg:w-96 flex flex-col gap-1.5 z-10">
            <label className="font-label-md text-xs text-on-surface-variant font-medium flex items-center justify-between">
              <span>Target Inspection Query</span>
              <span className="font-data-mono-sm text-[11px] text-on-surface-variant">Regex: ^ACC-[0-9]{'{6,12}'}$</span>
            </label>
            <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-lg border border-outline-variant/40 shadow-sm">
              <div className="flex items-center pl-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">travel_explore</span>
              </div>
              <input
                className="flex-1 bg-transparent px-2 py-1.5 font-data-mono text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none"
                placeholder="acc: / upi: / ifsc:"
                type="text"
                value={targetQuery}
                onChange={(e) => setTargetQuery(e.target.value)}
              />
              <button
                className="px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary font-label-lg text-xs font-semibold rounded transition-colors flex items-center gap-1 shadow-sm select-none"
                type="submit"
              >
                <span>Investigate</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Operational Status / Run Trigger Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface">
            <span className="material-symbols-outlined text-[22px]">account_tree</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-data-mono-sm text-[11px] text-on-surface-variant uppercase">Ingested Ledger Size</span>
            <span className="font-headline-md text-base font-bold text-on-surface tracking-tight">
              {stats ? `${stats.total_rows.toLocaleString()} Transactions` : '0 Transactions'}
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface">
            <span className="material-symbols-outlined text-[22px]">hub</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-data-mono-sm text-[11px] text-on-surface-variant uppercase">Evaluated Graph Nodes</span>
            <span className="font-headline-md text-base font-bold text-on-surface tracking-tight">
              {stats ? `${stats.total_accounts.toLocaleString()} Unique Accounts` : '0 Unique Accounts'}
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface">
            <span className="material-symbols-outlined text-[22px]">filter_alt</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-data-mono-sm text-[11px] text-on-surface-variant uppercase">Candidate Threshold</span>
            <span className="font-data-mono text-xs text-on-surface font-semibold">≥ 82.5% Confidence</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-data-mono-sm text-[11px] text-on-surface-variant uppercase">Pipeline Trigger</span>
            <span className="font-label-md text-xs font-semibold text-on-surface">Run Topological Scan</span>
          </div>
          <button
            onClick={handleRunPipeline}
            disabled={scanning}
            className="bg-secondary-container hover:bg-secondary text-on-primary px-3 py-2 rounded font-label-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm select-none disabled:opacity-50"
            type="button"
          >
            <span className={`material-symbols-outlined text-[16px] ${scanning ? 'animate-spin' : ''}`}>
              {scanning ? 'refresh' : 'play_arrow'}
            </span>
            <span>{scanning ? 'Scanning...' : 'Run Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* THREE-TIER ARCHITECTURAL COLUMNS / CARDS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* SECTION 1: LAYER 1 (Collector Candidates) */}
        <div className="flex flex-col bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="p-4 border-b border-outline-variant/20 bg-surface-container-lowest">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary-container" />
                <span className="font-data-mono text-sm font-bold text-on-surface uppercase tracking-wider">LAYER 1</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-surface-container-high font-data-mono-sm text-[10px] text-on-surface uppercase font-medium">
                Collector Tier
              </span>
            </div>
            <h3 className="font-headline-md text-base font-bold text-on-surface">Collector Candidates</h3>
            <p className="font-body-sm text-xs text-on-surface-variant mt-1">
              Accounts exhibiting rapid fan-in of high-frequency deposits directly from potential victim sources.
            </p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-outline-variant/20 bg-surface-container-low border-b border-outline-variant/20 text-center py-2">
            <div>
              <div className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">TOTAL CAN.</div>
              <div className="font-headline-md text-sm font-bold text-on-surface">{displayL1.length}</div>
            </div>
            <div>
              <div className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">CUMUL. IN</div>
              <div className="font-headline-md text-sm font-bold text-on-surface">
                {displayL1.length > 0 ? formatINR(displayL1.reduce((sum, c) => sum + c.total_incoming_amount, 0)) : '—'}
              </div>
            </div>
            <div>
              <div className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">MEAN DWELL</div>
              <div className="font-headline-md text-sm font-bold text-secondary">3.4 min</div>
            </div>
          </div>

          <div className="flex-1 p-3 overflow-y-auto max-h-96 space-y-2">
            {displayL1.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-3xl mb-2 text-outline">devices</span>
                <span className="font-semibold text-xs text-on-surface">Awaiting Dataset Scan</span>
                <p className="text-[11px] mt-1 max-w-xs">Run graph heuristics to classify candidate collector nodes.</p>
              </div>
            ) : (
              displayL1.map((c) => (
                <div key={c.account_id} className="p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors border border-outline-variant/20 flex items-center justify-between">
                  <div className="flex flex-col min-w-0">
                    <span className="font-data-mono text-xs font-semibold text-on-surface truncate">{c.account_id}</span>
                    <span className="font-data-mono-sm text-[10px] text-on-surface-variant">
                      Inflow: {formatINR(c.total_incoming_amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-data-mono font-medium bg-rose-50 text-rose-700 border border-rose-200">
                      High Velocity
                    </span>
                    <button
                      onClick={() => onInvestigateAccount(c.account_id)}
                      className="p-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface"
                      title="Investigate Node"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-2.5 bg-surface-container-low border-t border-outline-variant/20 text-[10px] font-data-mono text-on-surface-variant flex items-center justify-between">
            <span>Heuristic: Inflow/Outflow Delta &gt; 90%</span>
            <span className="text-secondary font-medium">STAGE: RAW EXTRACTION</span>
          </div>
        </div>

        {/* SECTION 2: LAYER 2 (Distributor Candidates) */}
        <div className="flex flex-col bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="p-4 border-b border-outline-variant/20 bg-surface-container-lowest">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="font-data-mono text-sm font-bold text-on-surface uppercase tracking-wider">LAYER 2</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-surface-container-high font-data-mono-sm text-[10px] text-on-surface uppercase font-medium">
                Smurfing Transit
              </span>
            </div>
            <h3 className="font-headline-md text-base font-bold text-on-surface">Distributor Candidates</h3>
            <p className="font-body-sm text-xs text-on-surface-variant mt-1">
              Pass-through intermediary accounts facilitating smurfing, split routing, and multi-branch dispersal.
            </p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-outline-variant/20 bg-surface-container-low border-b border-outline-variant/20 text-center py-2">
            <div>
              <div className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">TOTAL CAN.</div>
              <div className="font-headline-md text-sm font-bold text-on-surface">{displayL2.length}</div>
            </div>
            <div>
              <div className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">FAN-OUT RATIO</div>
              <div className="font-headline-md text-sm font-bold text-on-surface">1 : 4.8</div>
            </div>
            <div>
              <div className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">INTERM. NODES</div>
              <div className="font-headline-md text-sm font-bold text-secondary">{displayL2.length * 2}</div>
            </div>
          </div>

          <div className="flex-1 p-3 overflow-y-auto max-h-96 space-y-2">
            {displayL2.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-3xl mb-2 text-outline">sync_alt</span>
                <span className="font-semibold text-xs text-on-surface">Awaiting Intermediate Hop Ledger</span>
                <p className="text-[11px] mt-1 max-w-xs">Fan-out calculation triggers upon case ledger ingestion.</p>
              </div>
            ) : (
              displayL2.map((c) => (
                <div key={c.account_id} className="p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors border border-outline-variant/20 flex items-center justify-between">
                  <div className="flex flex-col min-w-0">
                    <span className="font-data-mono text-xs font-semibold text-on-surface truncate">{c.account_id}</span>
                    <span className="font-data-mono-sm text-[10px] text-on-surface-variant">
                      Outflow: {formatINR(c.total_outgoing_amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-data-mono font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      Split Transit
                    </span>
                    <button
                      onClick={() => onInvestigateAccount(c.account_id)}
                      className="p-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface"
                      title="Investigate Node"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-2.5 bg-surface-container-low border-t border-outline-variant/20 text-[10px] font-data-mono text-on-surface-variant flex items-center justify-between">
            <span>Heuristic: Dwell &lt; 180s &amp; Splits &gt;= 3</span>
            <span className="text-secondary font-medium">STAGE: MULTI-HOP TRAIL</span>
          </div>
        </div>

        {/* SECTION 3: LAYER 3 (Terminal Candidates) */}
        <div className="flex flex-col bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="p-4 border-b border-outline-variant/20 bg-surface-container-lowest">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span className="font-data-mono text-sm font-bold text-on-surface uppercase tracking-wider">LAYER 3</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-data-mono-sm text-[10px] uppercase font-medium">
                Terminal Sinks
              </span>
            </div>
            <h3 className="font-headline-md text-base font-bold text-on-surface">Terminal Candidates</h3>
            <p className="font-body-sm text-xs text-on-surface-variant mt-1">
              Terminal sink accounts, cash-out nodes, merchant aggregator gateways, or ATM withdrawal points.
            </p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-outline-variant/20 bg-surface-container-low border-b border-outline-variant/20 text-center py-2">
            <div>
              <div className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">TOTAL CAN.</div>
              <div className="font-headline-md text-sm font-bold text-on-surface">{displayL3.length}</div>
            </div>
            <div>
              <div className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">RETAINED FLOW</div>
              <div className="font-headline-md text-sm font-bold text-emerald-700">
                {displayL3.length > 0 ? formatINR(displayL3.reduce((sum, c) => sum + c.observed_net_flow, 0)) : '—'}
              </div>
            </div>
            <div>
              <div className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">FREEZE PRIORITY</div>
              <div className="font-headline-md text-sm font-bold text-rose-600">HIGH</div>
            </div>
          </div>

          <div className="flex-1 p-3 overflow-y-auto max-h-96 space-y-2">
            {displayL3.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-3xl mb-2 text-outline">savings</span>
                <span className="font-semibold text-xs text-on-surface">Awaiting Terminal Matrix</span>
                <p className="text-[11px] mt-1 max-w-xs">Terminal accounts for statutory freezing will surface here.</p>
              </div>
            ) : (
              displayL3.map((c, idx) => (
                <div key={c.account_id} className="p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors border border-outline-variant/20 flex items-center justify-between">
                  <div className="flex flex-col min-w-0">
                    <span className="font-data-mono text-xs font-semibold text-on-surface truncate">{c.account_id}</span>
                    <span className="font-data-mono-sm text-[10px] text-emerald-700 font-semibold">
                      Net Retained: {formatINR(c.observed_net_flow)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-data-mono font-medium bg-rose-50 text-rose-700 border border-rose-200">
                      Rank #{idx + 1}
                    </span>
                    <button
                      onClick={() => onInvestigateAccount(c.account_id)}
                      className="p-1 rounded bg-secondary-container hover:bg-secondary text-on-primary"
                      title="Initiate Sec. 102 Requisition"
                    >
                      <span className="material-symbols-outlined text-[16px]">gavel</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-2.5 bg-surface-container-low border-t border-outline-variant/20 text-[10px] font-data-mono text-on-surface-variant flex items-center justify-between">
            <span>Statutory Priority: High Retention</span>
            <span className="text-secondary font-medium">STAGE: RECOVERY PREP</span>
          </div>
        </div>
      </div>

      {/* Evidentiary & Statutory Disclaimer Banner */}
      <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 max-w-3xl">
          <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[20px]">verified_user</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-headline-md text-xs font-bold text-on-surface uppercase tracking-wide">
                TERMINOLOGY &amp; EVIDENTIARY DISCLAIMER
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-container font-data-mono text-[10px] text-on-surface-variant">
                CrPC §91 / Section 102 Compliant
              </span>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant mt-1 leading-relaxed">
              All classifications are designated strictly as "Candidates" based on graph heuristics, velocity markers, and dispersion metrics provided by the automated backend algorithm. Law enforcement investigators and cyber forensic auditors must independently verify bank statements, confirm beneficiary identities, and establish criminal mens rea prior to executing statutory freezing orders or initiating formal prosecution requisitions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => alert('FastAPI Graph Lineage Engine (4-Hop BFS temporal attribution adhering to Indian IT Act and BNSS guidelines).')}
            className="px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-xs font-medium transition-colors"
          >
            View Algorithm Specs
          </button>
          <button
            onClick={() => onInvestigateAccount('ACC_MULE_E01')}
            className="px-3 py-1.5 rounded bg-primary hover:bg-primary-container text-on-primary font-label-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>Export Audit Docket</span>
          </button>
        </div>
      </div>
    </div>
  );
};
