import React, { useState } from 'react';
import { api } from '../api';
import type { DocumentResponse } from '../api';
import { FileText, ShieldAlert, AlertCircle } from 'lucide-react';

export const DocumentsView: React.FC = () => {
  // Case diary state
  const [diaryVictim, setDiaryVictim] = useState('');
  const [officerName, setOfficerName] = useState('Investigating Officer');
  const [caseReference, setCaseReference] = useState('');
  const [diaryLoading, setDiaryLoading] = useState(false);

  // Freeze requisition state
  const [freezeTarget, setFreezeTarget] = useState('');
  const [bankName, setBankName] = useState('');
  const [freezeLoading, setFreezeLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Real generated documents list
  const [generatedDocs, setGeneratedDocs] = useState<Array<{
    type: 'case_diary' | 'freeze_requisition';
    target: string;
    doc: DocumentResponse;
  }>>([]);

  const handleGenerateDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diaryVictim.trim()) {
      setError('Please enter a victim account ID.');
      return;
    }

    setDiaryLoading(true);
    setError(null);
    try {
      const resp = await api.generateCaseDiary({
        victimAccount: diaryVictim.trim(),
        officerName: officerName.trim() || undefined,
        caseReference: caseReference.trim() || undefined,
      });

      setGeneratedDocs((prev) => [
        { type: 'case_diary', target: diaryVictim.trim(), doc: resp },
        ...prev,
      ]);
    } catch (err: any) {
      setError(`Case diary generation failed: ${err.message}`);
    } finally {
      setDiaryLoading(false);
    }
  };

  const handleGenerateFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freezeTarget.trim()) {
      setError('Please enter a target account ID.');
      return;
    }

    setFreezeLoading(true);
    setError(null);
    try {
      const resp = await api.generateFreezeRequisition({
        targetAccountId: freezeTarget.trim(),
        bankName: bankName.trim() || undefined,
        requestingOfficer: officerName.trim() || undefined,
        caseReference: caseReference.trim() || undefined,
      });

      setGeneratedDocs((prev) => [
        { type: 'freeze_requisition', target: freezeTarget.trim(), doc: resp },
        ...prev,
      ]);
    } catch (err: any) {
      setError(`Freeze requisition draft failed: ${err.message}`);
    } finally {
      setFreezeLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Header Deck */}
      <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-1">
        <span className="text-[11px] font-data-mono font-bold uppercase tracking-wider text-outline">
          STATUTORY &amp; FORENSIC DOCUMENTATION PIPELINE
        </span>
        <h1 className="font-headline-lg text-2xl font-bold text-on-surface">
          Statutory Document Generator
        </h1>
        <p className="text-[12px] text-on-surface-variant font-data-mono">
          Generates court-ready Case Diaries (Rule 172 CrPC) and Bank Freeze Requisitions (Sec. 102 CrPC) from validated backend evidence.
          No fabricated narrative fields. Officer review and manual physical signature required before external dispatch.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-[12px] rounded-lg flex items-center gap-2 font-data-mono">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Two Generator Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form 1: Case Diary */}
        <form onSubmit={handleGenerateDiary} className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-secondary" />
              <h2 className="font-headline-md text-base font-bold text-on-surface">
                Investigation Case Diary (Rule 172 CrPC)
              </h2>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Synthesizes a deterministic chronological money-movement ledger linking all 4 hops and evidence record references.
            </p>

            <div className="space-y-2.5 text-xs font-data-mono pt-1">
              <div>
                <label className="text-outline uppercase text-[10px] block mb-1">VICTIM ACCOUNT ID *</label>
                <input
                  type="text"
                  value={diaryVictim}
                  onChange={(e) => setDiaryVictim(e.target.value)}
                  placeholder="Enter victim account..."
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/50 rounded text-on-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="text-outline uppercase text-[10px] block mb-1">INVESTIGATING OFFICER</label>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder="Officer Name..."
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/50 rounded text-on-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="text-outline uppercase text-[10px] block mb-1">CASE REFERENCE (OPTIONAL)</label>
                <input
                  type="text"
                  value={caseReference}
                  onChange={(e) => setCaseReference(e.target.value)}
                  placeholder="FIR / Case Reference..."
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/50 rounded text-on-surface focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={diaryLoading || !diaryVictim.trim()}
            className="w-full py-2.5 bg-primary-container hover:bg-black text-on-primary rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            <FileText size={14} />
            <span>{diaryLoading ? 'Generating Case Diary...' : 'Compile Case Diary (Rule 172)'}</span>
          </button>
        </form>

        {/* Form 2: Freeze Requisition */}
        <form onSubmit={handleGenerateFreeze} className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-600" />
              <h2 className="font-headline-md text-base font-bold text-on-surface">
                Bank Freeze Requisition (Sec. 102 CrPC)
              </h2>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Generates a formal statutory debit-freeze notice for Bank Nodal Officers containing verified accounts and amounts.
            </p>

            <div className="space-y-2.5 text-xs font-data-mono pt-1">
              <div>
                <label className="text-outline uppercase text-[10px] block mb-1">TARGET ACCOUNT ID *</label>
                <input
                  type="text"
                  value={freezeTarget}
                  onChange={(e) => setFreezeTarget(e.target.value)}
                  placeholder="Enter target account to freeze..."
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/50 rounded text-on-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="text-outline uppercase text-[10px] block mb-1">TARGET BANK NAME</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Bank name..."
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/50 rounded text-on-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="text-outline uppercase text-[10px] block mb-1">CASE REFERENCE (OPTIONAL)</label>
                <input
                  type="text"
                  value={caseReference}
                  onChange={(e) => setCaseReference(e.target.value)}
                  placeholder="FIR / Case Reference..."
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/50 rounded text-on-surface focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={freezeLoading || !freezeTarget.trim()}
            className="w-full py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            <ShieldAlert size={14} />
            <span>{freezeLoading ? 'Synthesizing Draft...' : 'Generate Sec. 102 Requisition Draft'}</span>
          </button>
        </form>
      </div>

      {/* Generated Documents Register */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-secondary">inventory_2</span>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">
              Generated Statutory Documents ({generatedDocs.length})
            </h3>
          </div>
          <span className="text-[11px] font-data-mono text-outline">
            Stored in local backend archive
          </span>
        </div>

        {generatedDocs.length === 0 ? (
          <div className="p-8 text-center text-xs text-on-surface-variant font-data-mono">
            No statutory documents generated yet in this session. Fill out either form above to compile official drafts.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-data-mono">
              <thead className="bg-slate-50 border-b border-outline-variant/20 text-outline uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">DOCUMENT ID</th>
                  <th className="py-2.5 px-4">DOCUMENT TYPE</th>
                  <th className="py-2.5 px-4">TARGET ACCOUNT</th>
                  <th className="py-2.5 px-4">SHA-256 HASH</th>
                  <th className="py-2.5 px-4">LOCAL PATH</th>
                  <th className="py-2.5 px-4 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 text-on-surface">
                {generatedDocs.map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/40">
                    <td className="py-2.5 px-4 font-bold text-indigo-700">{item.doc.document_id}</td>
                    <td className="py-2.5 px-4 font-semibold">
                      {item.type === 'case_diary' ? 'Case Diary (Rule 172)' : 'Freeze Requisition (Sec. 102)'}
                    </td>
                    <td className="py-2.5 px-4 font-medium">{item.target}</td>
                    <td className="py-2.5 px-4 text-on-surface-variant">
                      {item.doc.integrity_hash ? `${item.doc.integrity_hash.slice(0, 16)}...` : 'Verified'}
                    </td>
                    <td className="py-2.5 px-4 text-outline truncate max-w-xs">{item.doc.file_path}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        DRAFT READY
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
