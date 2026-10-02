import React, { useState } from 'react';
import { api } from '../api';
import type { CrossVictimResponse } from '../api';
import { Network, AlertCircle, Smartphone, Wifi } from 'lucide-react';

interface CrossVictimViewProps {
  onInvestigateAccount: (accountId: string) => void;
}

export const CrossVictimView: React.FC<CrossVictimViewProps> = ({ onInvestigateAccount }) => {
  const [victimsInput, setVictimsInput] = useState<string>('ACC_VIC_P4001, ACC_VIC_P4002');
  const [maxHops, setMaxHops] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CrossVictimResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    const list = victimsInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (list.length < 2) {
      setError('At least 2 distinct victim accounts are required for cross-victim correlation analysis.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const resp = await api.analyzeCrossVictim(list, undefined, maxHops);
      setResult(resp);
    } catch (e: any) {
      setError(e.message || 'Cross-victim correlation analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 pb-12 select-none">
      {/* Top Config Card */}
      <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-data-mono font-bold uppercase tracking-wider text-outline">
                MULTI-VICTIM SYNDICATE INFRASTRUCTURE DISCOVERY
              </span>
            </div>
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface mt-0.5">
              Cross-Victim Correlation Analysis
            </h1>
            <p className="text-[12px] text-on-surface-variant font-data-mono mt-0.5">
              Identifies candidate shared infrastructure nodes, connecting transactions, and anomalous IP/device clusters across multiple victims.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] font-data-mono text-outline">Max Depth:</span>
            {[2, 3, 4].map((h) => (
              <button
                key={h}
                onClick={() => setMaxHops(h)}
                className={`px-3 py-1 rounded text-[11px] font-data-mono font-bold transition-all ${
                  maxHops === h
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {h} Hops
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="space-y-2">
          <label className="text-[11px] font-data-mono font-semibold text-outline uppercase block">
            VICTIM ACCOUNT IDENTIFIERS (COMMA OR NEWLINE SEPARATED):
          </label>
          <div className="flex gap-2">
            <textarea
              rows={2}
              value={victimsInput}
              onChange={(e) => setVictimsInput(e.target.value)}
              placeholder="Enter at least 2 victim accounts (e.g. ACC_VIC_001, ACC_VIC_002)..."
              className="flex-1 p-2.5 bg-surface-container-low border border-outline-variant/50 rounded-lg text-[12px] font-data-mono text-on-surface focus:outline-none"
            />
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-6 bg-primary-container hover:bg-black text-on-primary font-bold text-[13px] rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                  Correlating...
                </>
              ) : (
                <>
                  <Network size={16} />
                  Analyze Syndicate
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-[12px] rounded-lg flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-5">
          {/* Disclaimer banner */}
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] rounded-lg font-data-mono">
            <strong>Candidate Terminology:</strong> {result.candidate_linkage_disclaimer}
          </div>

          {/* Shared Candidates Cards */}
          <div className="grid grid-cols-2 gap-4">
            {result.shared_infrastructure_candidates.map((cand) => (
              <div
                key={cand.candidate_account_id}
                className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-data-mono font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {cand.victim_count} Victims Converging
                      </span>
                    </div>
                    <h3 className="font-headline-md text-lg font-bold text-on-surface mt-1">
                      {cand.candidate_account_id}
                    </h3>
                  </div>

                  <button
                    onClick={() => onInvestigateAccount(cand.candidate_account_id)}
                    className="px-3 py-1 bg-surface-container hover:bg-surface-container-high rounded text-[11px] font-bold text-on-surface"
                  >
                    Investigate
                  </button>
                </div>

                <p className="text-[12px] text-on-surface-variant leading-relaxed">
                  {cand.linkage_rationale}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-data-mono pt-1">
                  <div className="p-2 bg-surface-container-low rounded">
                    <span className="text-outline uppercase text-[10px] block">TOTAL FLOWING AMOUNT</span>
                    <span className="font-bold text-emerald-700 mt-0.5 block">
                      ₹{cand.total_flowing_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-2 bg-surface-container-low rounded">
                    <span className="text-outline uppercase text-[10px] block">CONNECTED VICTIMS</span>
                    <span className="font-bold text-on-surface mt-0.5 block truncate">
                      {cand.connected_victim_accounts.join(', ')}
                    </span>
                  </div>
                </div>

                {/* Device and IP correlations */}
                <div className="flex items-center gap-4 text-[11px] font-data-mono text-outline border-t border-outline-variant/20 pt-2">
                  <span className="flex items-center gap-1">
                    <Smartphone size={13} />
                    {cand.shared_device_types.length > 0 ? cand.shared_device_types.join(', ') : 'Clean / None'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Wifi size={13} />
                    {cand.shared_ip_addresses.length > 0 ? cand.shared_ip_addresses.join(', ') : 'Clean / None'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {result.shared_infrastructure_candidates.length === 0 && (
            <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-on-surface-variant text-[13px]">
              No shared downstream accounts reached by 2 or more of the specified victims within {maxHops} hops.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
