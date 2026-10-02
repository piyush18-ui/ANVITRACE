import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { RecoveryCandidate, DocumentResponse } from '../api';

interface RecoveryViewProps {
  onInvestigateAccount: (accountId: string) => void;
}

export const RecoveryView: React.FC<RecoveryViewProps> = ({ onInvestigateAccount }) => {
  const [candidates, setCandidates] = useState<RecoveryCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [minNetFlow, setMinNetFlow] = useState<number>(1000);
  const [freezeStatus, setFreezeStatus] = useState<string | null>(null);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const data = await api.getRecoveryCandidates(undefined, 50);
      setCandidates(data.candidates || []);
    } catch (e) {
      console.error('Error fetching recovery candidates:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [minNetFlow]);

  const handleFreeze = async (accountId: string) => {
    setFreezeStatus(null);
    try {
      const resp: DocumentResponse = await api.generateFreezeRequisition({
        targetAccountId: accountId,
        requestingOfficer: 'Inv. D. Vance',
        bankName: 'Target Financial Entity',
        caseReference: 'CASE-2024-089A',
      });
      setFreezeStatus(`Draft requisition generated for ${accountId} (${resp.document_id}). Awaiting officer signature.`);
    } catch (err: any) {
      setFreezeStatus(`Error: ${err.message}`);
    }
  };

  const filtered = candidates.filter((c) => c.observed_net_flow >= minNetFlow);

  return (
    <div className="space-y-5 pb-12 select-none">
      <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-data-mono font-bold uppercase tracking-wider text-outline">
                ASSET RECOVERY &amp; OBSERVED NET FLOW
              </span>
            </div>
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface mt-0.5">Recovery Prioritization Queue</h1>
            <p className="text-[12px] text-on-surface-variant font-data-mono mt-0.5">
              Observed Net Flow = ∑(inflows) - ∑(outflows) strictly limited to dataset &amp; investigation scope. NOT a verified bank balance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] font-data-mono font-medium text-outline">Min Inflow:</span>
            <select
              value={minNetFlow}
              onChange={(e) => setMinNetFlow(Number(e.target.value))}
              className="bg-surface-container-low border border-outline-variant/40 rounded-md px-2.5 py-1 text-[12px] font-data-mono text-on-surface"
            >
              <option value="0">All Net Flows (&gt; ₹0)</option>
              <option value="1000">≥ ₹1,000</option>
              <option value="10000">≥ ₹10,000</option>
              <option value="50000">≥ ₹50,000</option>
              <option value="100000">≥ ₹1,00,000</option>
            </select>
          </div>
        </div>

        {freezeStatus && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] rounded-lg font-data-mono flex items-center justify-between">
            <span>{freezeStatus}</span>
            <button onClick={() => setFreezeStatus(null)} className="font-bold">✕</button>
          </div>
        )}
      </div>

      {/* Candidates Ledger Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
          <span className="font-headline-md text-[13px] font-bold text-on-surface">
            Ranked Investigation Candidates ({filtered.length})
          </span>
          <span className="text-[11px] font-data-mono text-outline">Ranked by Recovery Priority Score</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] font-data-mono">
            <thead className="bg-slate-50 border-b border-outline-variant/20 text-outline uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">ACCOUNT IDENTIFIER</th>
                <th className="py-2.5 px-3 text-right">TOTAL INFLOW</th>
                <th className="py-2.5 px-3 text-right">TOTAL OUTFLOW</th>
                <th className="py-2.5 px-4 text-right">OBSERVED NET FLOW</th>
                <th className="py-2.5 px-3 text-right">RETENTION %</th>
                <th className="py-2.5 px-3 text-center">RISK INDEX</th>
                <th className="py-2.5 px-3 text-center">PRIORITY SCORE</th>
                <th className="py-2.5 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15 text-on-surface">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-on-surface-variant">
                    Scanning account features and observed net flow...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-on-surface-variant">
                    No positive observed net flow accounts matching current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((cand) => (
                  <tr key={cand.account_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-indigo-700">{cand.account_id}</td>
                    <td className="py-2.5 px-3 text-right">₹{cand.total_incoming_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2.5 px-3 text-right text-on-surface-variant">
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
                        {cand.mule_risk_index ? cand.mule_risk_index.toFixed(1) : '0.0'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-on-surface">
                      {cand.recovery_priority_score.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onInvestigateAccount(cand.account_id)}
                          className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high rounded text-[10px] font-semibold text-on-surface transition-colors"
                        >
                          Trace
                        </button>
                        <button
                          onClick={() => handleFreeze(cand.account_id)}
                          className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded text-[10px] font-bold transition-colors shadow-xs"
                          title="Generate Bank Freeze Draft Requisition"
                        >
                          Freeze
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
