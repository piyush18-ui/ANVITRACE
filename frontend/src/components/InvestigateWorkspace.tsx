import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type {
  InvestigationTrace,
  AccountRiskProfile,
  AccountProfile,
  DocumentResponse,
  EvidenceSnapshotResponse,
  MoneyTrailEdge,
} from '../api';
import { MoneyFlowGraph } from './MoneyFlowGraph';
import {
  Search,
  FileCheck2,
  FileText,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';

interface InvestigateWorkspaceProps {
  initialAccountId?: string;
}

export const InvestigateWorkspace: React.FC<InvestigateWorkspaceProps> = ({
  initialAccountId = '',
}) => {
  const [searchAccount, setSearchAccount] = useState(initialAccountId);
  const [currentAccount, setCurrentAccount] = useState(initialAccountId);
  const [selectedHop, setSelectedHop] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results state
  const [traceData, setTraceData] = useState<InvestigationTrace | null>(null);
  const [riskProfile, setRiskProfile] = useState<AccountRiskProfile | null>(null);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'hops' | 'risk_features' | 'layers'>('hops');
  const [selectedTx, setSelectedTx] = useState<MoneyTrailEdge | null>(null);

  // Document / Snapshot Action status
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Auto-search if an initialAccountId is passed in
  useEffect(() => {
    if (initialAccountId && initialAccountId.trim()) {
      setSearchAccount(initialAccountId);
      handleSearch(initialAccountId);
    }
  }, [initialAccountId]);

  const handleSearch = async (accountToQuery?: string) => {
    const acc = (accountToQuery || searchAccount).trim();
    if (!acc) return;

    setLoading(true);
    setError(null);
    setActionMessage(null);
    setCurrentAccount(acc);

    try {
      const [trace, risk, profile] = await Promise.all([
        api.traceInvestigation(acc, { maxHops: selectedHop }).catch((e) => {
          throw e;
        }),
        api.getAccountRisk(acc).catch(() => null),
        api.getAccount(acc).catch(() => null),
      ]);

      setTraceData(trace);
      setRiskProfile(risk);
      setAccountProfile(profile);

      if (trace.money_trail && trace.money_trail.length > 0) {
        setSelectedTx(trace.money_trail[0]);
      } else {
        setSelectedTx(null);
      }
    } catch (err: any) {
      setTraceData(null);
      setRiskProfile(null);
      setAccountProfile(null);
      setError(err.message || `No investigation records found for account ${acc}`);
    } finally {
      setLoading(false);
    }
  };

  const handleHopChange = (hop: number) => {
    setSelectedHop(hop);
    if (currentAccount) {
      handleSearch(currentAccount);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!currentAccount) return;
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      const resp: EvidenceSnapshotResponse = await api.createSnapshot(currentAccount, undefined, selectedHop);
      setActionMessage({
        type: 'success',
        text: `Evidence snapshot recorded: ${resp.snapshot.investigation_id} • SHA-256 Digest: ${resp.snapshot.result_hash}`,
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Snapshot creation failed: ${err.message}` });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGenerateCaseDiary = async () => {
    if (!currentAccount) return;
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      const resp: DocumentResponse = await api.generateCaseDiary({
        victimAccount: currentAccount,
      });
      setActionMessage({
        type: 'success',
        text: `Case Diary generated: ${resp.document_id} (${resp.file_path}) • SHA-256: ${resp.integrity_hash.slice(0, 16)}...`,
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Case diary generation failed: ${err.message}` });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleFreezeRequisition = async (targetAcc?: string) => {
    const acc = targetAcc || currentAccount;
    if (!acc) return;
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      const resp: DocumentResponse = await api.generateFreezeRequisition({
        targetAccountId: acc,
      });
      setActionMessage({
        type: 'success',
        text: `Sec. 102 Bank Freeze Requisition Draft generated: ${resp.document_id} for ${acc}. Officer review required.`,
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Freeze requisition draft failed: ${err.message}` });
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);

  return (
    <div className="space-y-5 pb-12 select-none">
      {/* Search Header Controls */}
      <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-data-mono font-bold uppercase tracking-wider text-outline">
              INVESTIGATION WORKSPACE
            </span>
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface mt-0.5">
              Account Investigation &amp; 4-Hop Lineage
            </h1>
            <p className="text-[12px] text-on-surface-variant font-data-mono mt-0.5">
              Directional money trail, conservative amount attribution, risk signals, and statutory document synthesis.
            </p>
          </div>

          {/* Action Triggers */}
          {currentAccount && traceData && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSaveSnapshot}
                disabled={isActionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-md text-[12px] font-semibold border border-outline-variant/40 transition-colors disabled:opacity-50"
              >
                <FileCheck2 size={14} className="text-indigo-600" />
                Save Snapshot
              </button>
              <button
                onClick={handleGenerateCaseDiary}
                disabled={isActionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-md text-[12px] font-semibold border border-outline-variant/40 transition-colors disabled:opacity-50"
              >
                <FileText size={14} className="text-blue-600" />
                Case Diary
              </button>
              <button
                onClick={() => handleFreezeRequisition()}
                disabled={isActionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-md text-[12px] font-bold shadow-sm transition-colors disabled:opacity-50"
              >
                <ShieldAlert size={14} />
                Freeze Requisition (Sec. 102)
              </button>
            </div>
          )}
        </div>

        {/* Action feedback message */}
        {actionMessage && (
          <div
            className={`p-3 rounded-lg text-[12px] font-data-mono flex items-center justify-between ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : actionMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="text-outline font-bold hover:text-black">✕</button>
          </div>
        )}

        {/* Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              value={searchAccount}
              onChange={(e) => setSearchAccount(e.target.value)}
              placeholder="Enter Account ID to query real FastAPI backend (sender or receiver)..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/50 rounded-lg text-[13px] font-data-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !searchAccount.trim()}
            className="px-5 py-2.5 bg-primary-container text-on-primary hover:bg-black font-semibold text-[13px] rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                Tracing...
              </>
            ) : (
              <>
                <Search size={15} />
                Investigate
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-[12px] rounded-lg flex items-center gap-2 font-data-mono">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* When no investigation executed yet */}
      {!traceData && !loading && !error && (
        <div className="bg-surface-container-lowest p-12 rounded-xl border border-outline-variant/30 shadow-sm text-center flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline">
            <Search size={22} />
          </div>
          <h3 className="font-headline-md text-base font-bold text-on-surface">No Active Investigation Query</h3>
          <p className="text-xs text-on-surface-variant max-w-md">
            Enter an Account ID in the search field above to inspect transactions, compute 4-hop lineage, evaluate mule risk index, and generate statutory documentation.
          </p>
        </div>
      )}

      {/* Target Summary Cards & Risk Badges */}
      {traceData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/30 shadow-sm">
            <span className="text-[11px] font-data-mono text-outline uppercase font-semibold">Traversed Depth</span>
            <div className="text-2xl font-bold font-data-mono text-on-surface mt-1">
              {traceData.graph.total_hops_found} / {selectedHop} <span className="text-xs font-normal text-on-surface-variant">hops</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-data-mono font-medium">Bounded Temporal BFS</span>
          </div>

          <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/30 shadow-sm">
            <span className="text-[11px] font-data-mono text-outline uppercase font-semibold">Attributed Amount</span>
            <div className="text-2xl font-bold font-data-mono text-indigo-700 mt-1 truncate">
              {formatINR(traceData.graph.total_attributed_amount)}
            </div>
            <span className="text-[10px] text-on-surface-variant font-data-mono">Conservative Lineage</span>
          </div>

          <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/30 shadow-sm">
            <span className="text-[11px] font-data-mono text-outline uppercase font-semibold">Mule Risk Index</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold font-data-mono ${
                (riskProfile?.mule_risk_index || 0) >= 70
                  ? 'text-rose-600'
                  : (riskProfile?.mule_risk_index || 0) >= 40
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}>
                {riskProfile ? riskProfile.mule_risk_index.toFixed(1) : 'N/A'}
              </span>
              <span className="text-xs font-semibold text-on-surface-variant">
                {riskProfile?.risk_tier ? `[${riskProfile.risk_tier}]` : ''}
              </span>
            </div>
            <span className="text-[10px] text-on-surface-variant font-data-mono">
              {riskProfile ? `${riskProfile.features.length} Triggered Features` : 'Risk pending'}
            </span>
          </div>

          <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/30 shadow-sm">
            <span className="text-[11px] font-data-mono text-outline uppercase font-semibold">Account Net Flow</span>
            <div className="text-2xl font-bold font-data-mono text-on-surface mt-1 truncate">
              {accountProfile ? formatINR(accountProfile.observed_net_flow) : 'N/A'}
            </div>
            <span className="text-[10px] text-on-surface-variant font-data-mono">
              {accountProfile ? `In: ${formatINR(accountProfile.in_amount)} | Out: ${formatINR(accountProfile.out_amount)}` : 'In/Out profile'}
            </span>
          </div>
        </div>
      )}

      {/* Directional Temporal Graph */}
      {traceData && (
        <div>
          {traceData.money_trail.length === 0 ? (
            <div className="p-8 bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-center text-xs text-on-surface-variant">
              No transaction graph available for this investigation.
            </div>
          ) : (
            <MoneyFlowGraph
              nodes={traceData.graph.nodes}
              edges={traceData.money_trail}
              victimAccount={traceData.victim_account}
              selectedHop={selectedHop}
              onSelectHop={handleHopChange}
              onSelectAccount={(acc) => {
                setSearchAccount(acc);
                handleSearch(acc);
              }}
            />
          )}
        </div>
      )}

      {/* Bottom Ledger & Tabbed Details Container */}
      {traceData && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden space-y-0">
          {/* Tab Controls */}
          <div className="px-4 py-2.5 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('hops')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                  activeTab === 'hops'
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Temporal Hop Sequence ({traceData.money_trail.length})
              </button>
              <button
                onClick={() => setActiveTab('risk_features')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                  activeTab === 'risk_features'
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Risk Evidence Signals ({riskProfile?.features.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('layers')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                  activeTab === 'layers'
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Candidate Layers ({riskProfile?.layer_classifications.length || 0})
              </button>
            </div>

            <span className="text-[11px] font-data-mono text-on-surface-variant">
              Account: {traceData.victim_account}
            </span>
          </div>

          {/* Tab 1: Hop Table */}
          {activeTab === 'hops' && (
            <div className="overflow-x-auto">
              {traceData.money_trail.length === 0 ? (
                <div className="p-8 text-center text-xs text-on-surface-variant">
                  No outgoing or incoming 4-hop money movement recorded for this node.
                </div>
              ) : (
                <table className="w-full text-left text-[11px] font-data-mono">
                  <thead className="bg-slate-50 border-b border-outline-variant/20 text-outline uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">TIMESTAMP (UTC)</th>
                      <th className="py-2.5 px-2">HOP</th>
                      <th className="py-2.5 px-3">SENDER</th>
                      <th className="py-2.5 px-3">RECEIVER</th>
                      <th className="py-2.5 px-3 text-right">RAW AMOUNT</th>
                      <th className="py-2.5 px-3 text-right">ATTRIBUTED</th>
                      <th className="py-2.5 px-2">MODE</th>
                      <th className="py-2.5 px-2">STATUS</th>
                      <th className="py-2.5 px-3 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/15 text-on-surface">
                    {traceData.money_trail.map((edge) => {
                      const isSelected = selectedTx?.record_id === edge.record_id;
                      return (
                        <tr
                          key={edge.record_id}
                          onClick={() => setSelectedTx(edge)}
                          className={`cursor-pointer hover:bg-blue-50/50 transition-colors ${
                            isSelected ? 'bg-blue-50 font-semibold' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-on-surface-variant whitespace-nowrap">
                            {edge.timestamp ? new Date(edge.timestamp).toISOString().replace('T', ' ').slice(0, 19) : '-'}
                          </td>
                          <td className="py-2 px-2 font-bold text-indigo-700">H{edge.hop}</td>
                          <td className="py-2 px-3 font-medium">{edge.from_account}</td>
                          <td className="py-2 px-3 font-medium text-blue-700">{edge.to_account}</td>
                          <td className="py-2 px-3 text-right">{formatINR(edge.amount)}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">
                            {formatINR(edge.attributable_amount)}
                          </td>
                          <td className="py-2 px-2 text-outline">{edge.payment_mode}</td>
                          <td className="py-2 px-2">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              edge.is_cycle
                                ? 'bg-rose-100 text-rose-800'
                                : edge.lineage_status === 'traced'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {edge.is_cycle ? 'CYCLE' : edge.lineage_status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFreezeRequisition(edge.to_account);
                              }}
                              className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[10px] font-bold border border-rose-200"
                              title="Draft Freeze Requisition"
                            >
                              Freeze Target
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab 2: Real Risk Features Explanation */}
          {activeTab === 'risk_features' && (
            <div className="p-4 space-y-3">
              {riskProfile?.features && riskProfile.features.length > 0 ? (
                riskProfile.features.map((feat, idx) => (
                  <div key={idx} className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[13px] text-on-surface">{feat.feature_name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-data-mono">
                          Contribution: +{feat.score_contribution.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-[12px] text-on-surface-variant mt-1">{feat.explanation}</p>
                      {feat.supporting_record_ids && feat.supporting_record_ids.length > 0 && (
                        <div className="text-[10px] font-data-mono text-outline mt-1 truncate">
                          Records: {feat.supporting_record_ids.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="text-right font-data-mono text-xs">
                      <span className="text-outline uppercase text-[10px] block">MEASURED VALUE</span>
                      <span className="font-bold text-on-surface">
                        {typeof feat.measured_value === 'number' ? feat.measured_value.toFixed(2) : String(feat.measured_value)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-on-surface-variant">
                  No risk features triggered for this account in backend assessment.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Candidate Layers */}
          {activeTab === 'layers' && (
            <div className="p-4 space-y-3">
              {riskProfile?.layer_classifications && riskProfile.layer_classifications.length > 0 ? (
                riskProfile.layer_classifications.map((layer, idx) => (
                  <div key={idx} className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs">
                      L{idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[13px] text-on-surface">{layer.role}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-data-mono text-[10px] font-bold">
                          {(layer.confidence * 100).toFixed(0)}% Confidence
                        </span>
                      </div>
                      <p className="text-[12px] text-on-surface-variant mt-1">{layer.evidence_summary}</p>
                      {layer.supporting_record_ids && layer.supporting_record_ids.length > 0 && (
                        <div className="text-[10px] font-data-mono text-outline mt-1">
                          Supporting Records: {layer.supporting_record_ids.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-on-surface-variant">
                  No specific Layer 1, Layer 2, or Layer 3 candidate roles classified for this account.
                </div>
              )}
            </div>
          )}

          {/* Raw Evidentiary Field Verification Drawer */}
          {selectedTx && (
            <div className="p-4 bg-slate-50 border-t border-outline-variant/30">
              <div className="flex items-center gap-2 mb-2 text-[11px] font-data-mono font-bold text-outline uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                Raw Evidentiary Field Verification (Transaction Ref: {selectedTx.Transaction_ID})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px] font-data-mono">
                <div className="p-2.5 bg-white rounded border border-outline-variant/30">
                  <span className="text-[10px] text-outline uppercase block">EGRESS IP ADDRESS</span>
                  <span className="font-bold text-on-surface mt-0.5 block truncate">
                    {selectedTx.provenance?.ip || 'UNAVAILABLE IN LEDGER'}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded border border-outline-variant/30">
                  <span className="text-[10px] text-outline uppercase block">DEVICE / AGENT HASH</span>
                  <span className="font-bold text-on-surface mt-0.5 block truncate">
                    {selectedTx.provenance?.device || 'UNAVAILABLE IN LEDGER'}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded border border-outline-variant/30">
                  <span className="text-[10px] text-outline uppercase block">RAW RECORD AMOUNT</span>
                  <span className="font-bold text-emerald-700 mt-0.5 block">
                    {formatINR(selectedTx.amount)} ({selectedTx.payment_mode})
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded border border-outline-variant/30">
                  <span className="text-[10px] text-outline uppercase block">PAYMENT NARRATION</span>
                  <span className="font-bold text-on-surface mt-0.5 block truncate">
                    {selectedTx.provenance?.narration || 'UNAVAILABLE'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
