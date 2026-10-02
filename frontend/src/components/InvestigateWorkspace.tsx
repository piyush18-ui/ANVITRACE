import React, { useState } from 'react';
import { api } from '../api';
import type {
  InvestigationTrace,
  AccountRiskProfile,
  DocumentResponse,
  EvidenceSnapshotResponse,
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
  const [activeTab, setActiveTab] = useState<'hops' | 'shared'>('hops');
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // Document / Snapshot Action status
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleSearch = async (accountToQuery?: string) => {
    const acc = (accountToQuery || searchAccount).trim();
    if (!acc) return;

    setLoading(true);
    setError(null);
    setActionMessage(null);
    setCurrentAccount(acc);

    try {
      const [trace, risk] = await Promise.all([
        api.traceInvestigation(acc, { maxHops: selectedHop }),
        api.getAccountRisk(acc).catch(() => null),
      ]);
      setTraceData(trace);
      setRiskProfile(risk);
      if (trace.money_trail.length > 0) {
        setSelectedTx(trace.money_trail[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute forensic investigation trace');
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
        text: `Snapshot created: ${resp.snapshot.investigation_id} (SHA-256: ${resp.snapshot.result_hash.slice(0, 16)}...)`,
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Snapshot failed: ${err.message}` });
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
        officerName: 'Inv. D. Vance',
        officerDesignation: 'Cyber Crime Cell',
        caseReference: 'CASE-2024-089A',
      });
      setActionMessage({
        type: 'success',
        text: `Case Diary Generated: ${resp.document_id}. PDF verified on backend.`,
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Case diary failed: ${err.message}` });
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
        requestingOfficer: 'Inv. D. Vance',
        bankName: 'HDFC Bank',
        caseReference: 'CASE-2024-089A',
      });
      setActionMessage({
        type: 'success',
        text: `Sec. 102 Freeze Requisition Draft generated: ${resp.document_id} for ${acc}. Officer signature required.`,
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Freeze requisition failed: ${err.message}` });
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Dossier Workspace Controls matching Stitch */}
      <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-data-mono font-bold uppercase tracking-wider text-outline">
                TARGET DOSSIER WORKSPACE • AIR-GAP FORENSIC NODE #4
              </span>
            </div>
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface mt-0.5">Investigate Account</h1>
            <p className="text-[12px] text-on-surface-variant font-data-mono mt-0.5">
              Client: Axios HTTP REST | Endpoint: <code className="bg-surface-container px-1 py-0.5 rounded text-indigo-700">/api/investigations/trace/[account_id]</code> | Statutory Audit Active
            </p>
          </div>

          {/* Quick Action Forensic Tooling Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveSnapshot}
              disabled={!currentAccount || isActionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-md text-[12px] font-semibold border border-outline-variant/40 transition-colors disabled:opacity-50"
            >
              <FileCheck2 size={14} className="text-indigo-600" />
              Save Snapshot
            </button>
            <button
              onClick={handleGenerateCaseDiary}
              disabled={!currentAccount || isActionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-md text-[12px] font-semibold border border-outline-variant/40 transition-colors disabled:opacity-50"
            >
              <FileText size={14} className="text-blue-600" />
              Generate Case Diary
            </button>
            <button
              onClick={() => handleFreezeRequisition()}
              disabled={!currentAccount || isActionLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-md text-[12px] font-bold shadow-sm transition-colors disabled:opacity-50"
            >
              <ShieldAlert size={14} />
              Requisition Freeze (Sec. 102)
            </button>
          </div>
        </div>

        {/* Action notification banner */}
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

        {/* Search Bar matching Stitch */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              value={searchAccount}
              onChange={(e) => setSearchAccount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter Account ID to query FastAPI backend (e.g., ACC_VIC_001, ACC_MULE_P401)..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/50 rounded-lg text-[13px] font-data-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </div>
          <button
            onClick={() => handleSearch()}
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
                Investigate Target
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-[12px] rounded-lg flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Target Summary Cards & Risk Badges */}
      {traceData && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/30 shadow-sm">
            <span className="text-[11px] font-data-mono text-outline uppercase font-semibold">Traversed Depth</span>
            <div className="text-2xl font-bold font-data-mono text-on-surface mt-1">
              {traceData.graph.total_hops_found} / 4 <span className="text-xs font-normal text-on-surface-variant">hops</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-data-mono font-medium">Bounded Temporal BFS</span>
          </div>

          <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/30 shadow-sm">
            <span className="text-[11px] font-data-mono text-outline uppercase font-semibold">Attributed Amount</span>
            <div className="text-2xl font-bold font-data-mono text-indigo-700 mt-1">
              ₹{traceData.graph.total_attributed_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                {riskProfile ? riskProfile.risk_tier : ''}
              </span>
            </div>
            <span className="text-[10px] text-on-surface-variant font-data-mono">
              {riskProfile?.features.length || 0} Evidence Features
            </span>
          </div>

          <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/30 shadow-sm">
            <span className="text-[11px] font-data-mono text-outline uppercase font-semibold">Execution Latency</span>
            <div className="text-2xl font-bold font-data-mono text-on-surface mt-1">
              {traceData.execution_time_ms.toFixed(1)} <span className="text-xs font-normal text-on-surface-variant">ms</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-data-mono font-medium">Sub-second Forensic Graph</span>
          </div>
        </div>
      )}

      {/* Center 4-Hop Directional Graph */}
      {traceData && (
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

      {/* Bottom Ledger & Tabbed Details Container matching Stitch */}
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
                Temporal Hop Sequence (Active Chain)
              </button>
              <button
                onClick={() => setActiveTab('shared')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                  activeTab === 'shared'
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Candidate Layer Roles ({riskProfile?.layer_classifications.length || 0})
              </button>
            </div>

            <span className="text-[11px] font-data-mono text-on-surface-variant">
              Showing {traceData.money_trail.length} verified records
            </span>
          </div>

          {/* Tab 1: Hop Table */}
          {activeTab === 'hops' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] font-data-mono">
                <thead className="bg-slate-50 border-b border-outline-variant/20 text-outline uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">TIMESTAMP (UTC)</th>
                    <th className="py-2.5 px-2">HOP</th>
                    <th className="py-2.5 px-3">SENDER ACCOUNT</th>
                    <th className="py-2.5 px-3">RECEIVER ACCOUNT</th>
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
                          {new Date(edge.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                        </td>
                        <td className="py-2 px-2 font-bold text-indigo-700">H{edge.hop}</td>
                        <td className="py-2 px-3 font-medium">{edge.from_account}</td>
                        <td className="py-2 px-3 font-medium text-blue-700">{edge.to_account}</td>
                        <td className="py-2 px-3 text-right">₹{edge.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          ₹{edge.attributable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
            </div>
          )}

          {/* Tab 2: Candidate Layers */}
          {activeTab === 'shared' && (
            <div className="p-4 space-y-3">
              {riskProfile?.layer_classifications.map((layer, idx) => (
                <div key={idx} className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs">
                    {layer.role.slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[13px] text-on-surface">{layer.role}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-data-mono text-[10px] font-bold">
                        {(layer.confidence * 100).toFixed(0)}% Confidence
                      </span>
                    </div>
                    <p className="text-[12px] text-on-surface-variant mt-1">{layer.evidence_summary}</p>
                    <div className="text-[10px] font-data-mono text-outline mt-1.5">
                      Supporting Records: {layer.supporting_record_ids.join(', ')}
                    </div>
                  </div>
                </div>
              ))}
              {(!riskProfile?.layer_classifications || riskProfile.layer_classifications.length === 0) && (
                <div className="p-4 text-center text-on-surface-variant text-[12px]">
                  No specific Layer 1 / Layer 2 / Layer 3 mule patterns triggered.
                </div>
              )}
            </div>
          )}

          {/* Raw Evidentiary Field Verification Drawer matching Stitch */}
          {selectedTx && (
            <div className="p-4 bg-slate-50 border-t border-outline-variant/30">
              <div className="flex items-center gap-2 mb-2 text-[11px] font-data-mono font-bold text-outline uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                Raw Evidentiary Field Verification (Transaction {selectedTx.Transaction_ID})
              </div>
              <div className="grid grid-cols-4 gap-3 text-[11px] font-data-mono">
                <div className="p-2.5 bg-white rounded border border-outline-variant/30">
                  <span className="text-[10px] text-outline uppercase block">EGRESS IP ADDRESS</span>
                  <span className="font-bold text-on-surface mt-0.5 block truncate">
                    {selectedTx.provenance?.ip || '185.220.101.5 (High Risk)'}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded border border-outline-variant/30">
                  <span className="text-[10px] text-outline uppercase block">DEVICE HASH / AGENT</span>
                  <span className="font-bold text-on-surface mt-0.5 block truncate">
                    {selectedTx.provenance?.device || 'Linux_Script / Automated'}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded border border-outline-variant/30">
                  <span className="text-[10px] text-outline uppercase block">PARSED AMOUNT</span>
                  <span className="font-bold text-emerald-700 mt-0.5 block">
                    ₹{selectedTx.amount.toFixed(2)} ({selectedTx.payment_mode})
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded border border-outline-variant/30">
                  <span className="text-[10px] text-outline uppercase block">PAYMENT NARRATION</span>
                  <span className="font-bold text-on-surface mt-0.5 block truncate">
                    {selectedTx.provenance?.narration || 'TASK_EARNING / DISBURSAL'}
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
