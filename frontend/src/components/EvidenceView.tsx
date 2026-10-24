import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { EvidenceSnapshotResponse } from '../api';
import { ShieldCheck, Fingerprint, Lock, Copy, Check, FileCheck, AlertCircle } from 'lucide-react';

interface EvidenceViewProps {
  onInvestigateAccount?: (accountId: string) => void;
  initialAccountId?: string;
}

export const EvidenceView: React.FC<EvidenceViewProps> = ({
  onInvestigateAccount,
  initialAccountId = '',
}) => {
  const [targetAccount, setTargetAccount] = useState<string>(initialAccountId);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<EvidenceSnapshotResponse[]>(() => {
    try {
      const saved = sessionStorage.getItem('anvitrace_evidence_snapshots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedSnapshot, setSelectedSnapshot] = useState<EvidenceSnapshotResponse | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    if (snapshots.length > 0 && !selectedSnapshot) {
      setSelectedSnapshot(snapshots[0]);
    }
  }, [snapshots]);

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    const acc = targetAccount.trim();
    if (!acc) return;

    setLoading(true);
    setError(null);

    try {
      const resp = await api.createSnapshot(acc);
      const updated = [resp, ...snapshots.filter((s) => s.snapshot.investigation_id !== resp.snapshot.investigation_id)];
      setSnapshots(updated);
      setSelectedSnapshot(resp);
      try {
        sessionStorage.setItem('anvitrace_evidence_snapshots', JSON.stringify(updated));
      } catch (err) {
        console.warn('Could not persist snapshot to sessionStorage', err);
      }
    } catch (err: any) {
      setError(err.message || 'Evidence snapshot creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Header and Snapshot Generator */}
      <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-data-mono font-bold uppercase tracking-wider text-outline">
                SECTION 65B INDIAN EVIDENCE ACT // SHA-256 DIGITAL CHAIN OF CUSTODY
              </span>
            </div>
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface mt-0.5">
              Evidence Registry &amp; Cryptographic Integrity
            </h1>
            <p className="text-[12px] text-on-surface-variant font-data-mono mt-0.5">
              Deterministic evidence snapshots, Merkle provenance root, and SHA-256 digests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-data-mono font-semibold">
              <ShieldCheck size={15} />
              Tamper-Proof Guarantee
            </span>
          </div>
        </div>

        {/* Snapshot Creation Form */}
        <form onSubmit={handleCreateSnapshot} className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 flex flex-col sm:flex-row items-center gap-3">
          <span className="text-[12px] font-data-mono font-semibold text-outline shrink-0">TARGET ACCOUNT:</span>
          <input
            type="text"
            value={targetAccount}
            onChange={(e) => setTargetAccount(e.target.value)}
            placeholder="Enter Account ID to create cryptographic snapshot..."
            className="flex-1 w-full bg-white border border-outline-variant/50 rounded-md px-3 py-2 text-[13px] font-data-mono text-on-surface focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !targetAccount.trim()}
            className="w-full sm:w-auto px-5 py-2 bg-primary-container hover:bg-black text-on-primary rounded-md text-[12px] font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                Sealing Snapshot...
              </>
            ) : (
              <>
                <Fingerprint size={16} />
                Seal Cryptographic Snapshot
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-data-mono text-rose-800 flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Snapshots Log / Inspection Area */}
      {snapshots.length === 0 ? (
        <div className="bg-surface-container-lowest p-12 rounded-xl border border-outline-variant/30 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-surface-container-low mx-auto flex items-center justify-center text-outline">
            <Fingerprint size={24} />
          </div>
          <h3 className="font-headline-md text-base font-bold text-on-surface">No Evidence Snapshots Recorded</h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto font-data-mono">
            Enter an Account ID above to seal an immutable Section 65B compliant SHA-256 evidence snapshot.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Snapshots History List (1 col) */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-data-mono font-bold text-outline uppercase">
                RECORDED SNAPSHOTS ({snapshots.length})
              </span>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {snapshots.map((s) => {
                const isSelected = selectedSnapshot?.snapshot.investigation_id === s.snapshot.investigation_id;
                return (
                  <button
                    key={s.snapshot.investigation_id}
                    onClick={() => setSelectedSnapshot(s)}
                    className={`w-full text-left p-3 rounded-lg border transition-all text-xs font-data-mono ${
                      isSelected
                        ? 'bg-primary-container text-on-primary border-primary font-bold shadow-sm'
                        : 'bg-surface-container-low border-outline-variant/30 hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="truncate">{s.snapshot.victim_account}</span>
                      <span className="opacity-75">{new Date(s.snapshot.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-[10px] opacity-80 mt-1 truncate">
                      ID: {s.snapshot.investigation_id}
                    </div>
                    <div className="text-[9px] opacity-70 mt-0.5 truncate">
                      SHA: {s.snapshot.result_hash.slice(0, 16)}...
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Snapshot Detail View (3 cols) */}
          {selectedSnapshot && (
            <div className="lg:col-span-3 space-y-4">
              {/* Provenance & Integrity Banner */}
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
                  <div>
                    <span className="text-[10px] font-data-mono text-outline uppercase font-semibold">
                      INVESTIGATION DOSSIER
                    </span>
                    <h2 className="font-headline-md text-lg font-bold text-on-surface">
                      Snapshot: {selectedSnapshot.snapshot.investigation_id}
                    </h2>
                    <span className="text-xs text-on-surface-variant font-data-mono">
                      Target Account: <strong className="text-indigo-700">{selectedSnapshot.snapshot.victim_account}</strong>
                    </span>
                  </div>
                  {onInvestigateAccount && (
                    <button
                      onClick={() => onInvestigateAccount(selectedSnapshot.snapshot.victim_account)}
                      className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/40 rounded text-xs font-bold transition-colors shadow-xs"
                    >
                      Inspect in Workspace →
                    </button>
                  )}
                </div>

                {/* Cryptographic Hashes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-data-mono text-xs">
                  <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 space-y-1">
                    <span className="text-[10px] text-outline uppercase font-bold flex items-center justify-between">
                      <span>RESULT INTEGRITY HASH (SHA-256)</span>
                      <button
                        onClick={() => copyToClipboard(selectedSnapshot.snapshot.result_hash)}
                        className="text-indigo-700 hover:text-black flex items-center gap-1"
                      >
                        {copiedHash === selectedSnapshot.snapshot.result_hash ? <Check size={12} /> : <Copy size={12} />}
                        <span className="text-[9px]">{copiedHash === selectedSnapshot.snapshot.result_hash ? 'COPIED' : 'COPY'}</span>
                      </button>
                    </span>
                    <p className="font-mono text-[11px] text-indigo-900 break-all font-semibold">
                      {selectedSnapshot.snapshot.result_hash}
                    </p>
                  </div>

                  <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 space-y-1">
                    <span className="text-[10px] text-outline uppercase font-bold flex items-center justify-between">
                      <span>DATASET ROOT HASH (SHA-256)</span>
                      <button
                        onClick={() => copyToClipboard(selectedSnapshot.snapshot.dataset_hash)}
                        className="text-indigo-700 hover:text-black flex items-center gap-1"
                      >
                        {copiedHash === selectedSnapshot.snapshot.dataset_hash ? <Check size={12} /> : <Copy size={12} />}
                        <span className="text-[9px]">{copiedHash === selectedSnapshot.snapshot.dataset_hash ? 'COPIED' : 'COPY'}</span>
                      </button>
                    </span>
                    <p className="font-mono text-[11px] text-on-surface break-all font-semibold">
                      {selectedSnapshot.snapshot.dataset_hash}
                    </p>
                  </div>
                </div>

                {/* Statutory Certification & Reproducibility Note */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-data-mono text-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Lock size={14} className="text-secondary" />
                    <span>Statutory Integrity &amp; Reproducibility Guarantee</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-700">
                    {selectedSnapshot.reproducibility_note || selectedSnapshot.snapshot.integrity_disclaimer}
                  </p>
                </div>
              </div>

              {/* Underlying Forensic Evidence Records Table */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck size={16} className="text-secondary" />
                    <h3 className="font-headline-md text-sm font-bold text-on-surface">
                      Underlying Supporting Evidence Records ({selectedSnapshot.snapshot.evidence_items?.length || 0})
                    </h3>
                  </div>
                  <span className="text-[10px] font-data-mono text-outline">
                    Max Depth: {selectedSnapshot.snapshot.max_hops} Hops
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-left text-[11px] font-data-mono">
                    <thead className="bg-slate-50 border-b border-outline-variant/20 text-outline uppercase sticky top-0 font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">RECORD ID</th>
                        <th className="py-2.5 px-4">TX ID</th>
                        <th className="py-2.5 px-3">SENDER</th>
                        <th className="py-2.5 px-3">RECEIVER</th>
                        <th className="py-2.5 px-3 text-center">HOP</th>
                        <th className="py-2.5 px-4 text-right">AMOUNT (INR)</th>
                        <th className="py-2.5 px-4">TIMESTAMP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/15 text-on-surface">
                      {(!selectedSnapshot.snapshot.evidence_items || selectedSnapshot.snapshot.evidence_items.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-on-surface-variant">
                            No individual transaction records linked to this snapshot.
                          </td>
                        </tr>
                      ) : (
                        selectedSnapshot.snapshot.evidence_items.map((item: any, idx: number) => (
                          <tr key={item.record_id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-4 font-semibold text-indigo-700">{item.record_id || 'N/A'}</td>
                            <td className="py-2 px-4 text-on-surface-variant">{item.transaction_id || 'N/A'}</td>
                            <td className="py-2 px-3 font-medium">{item.sender_account || 'N/A'}</td>
                            <td className="py-2 px-3 font-medium text-indigo-700">{item.receiver_account || 'N/A'}</td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-bold text-[10px]">
                                {item.hop_level !== undefined ? `H${item.hop_level}` : 'H1'}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-right font-bold text-emerald-700">
                              {item.amount ? formatINR(item.amount) : '₹0.00'}
                            </td>
                            <td className="py-2 px-4 text-on-surface-variant text-[10px]">
                              {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
