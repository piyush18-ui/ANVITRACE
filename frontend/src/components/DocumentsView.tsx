import React, { useState } from 'react';
import { api } from '../api';
import type { DocumentResponse } from '../api';
import { FileText, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

export const DocumentsView: React.FC = () => {
  // Case diary state
  const [diaryVictim, setDiaryVictim] = useState('ACC_VIC_P4001');
  const [officerName, setOfficerName] = useState('Inv. D. Vance');
  const [officerDesignation, setOfficerDesignation] = useState('Cyber Crime Forensic Cell');
  const [caseReference, setCaseReference] = useState('CASE-2024-089A');
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [diaryResult, setDiaryResult] = useState<DocumentResponse | null>(null);

  // Freeze requisition state
  const [freezeTarget, setFreezeTarget] = useState('ACC_MULE_P401');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [freezeResult, setFreezeResult] = useState<DocumentResponse | null>(null);

  const [error, setError] = useState<string | null>(null);

  const handleGenerateDiary = async () => {
    if (!diaryVictim.trim()) return;
    setDiaryLoading(true);
    setError(null);
    try {
      const resp = await api.generateCaseDiary({
        victimAccount: diaryVictim.trim(),
        officerName,
        officerDesignation,
        caseReference,
      });
      setDiaryResult(resp);
    } catch (e: any) {
      setError(e.message || 'Case diary generation failed');
    } finally {
      setDiaryLoading(false);
    }
  };

  const handleGenerateFreeze = async () => {
    if (!freezeTarget.trim()) return;
    setFreezeLoading(true);
    setError(null);
    try {
      const resp = await api.generateFreezeRequisition({
        targetAccountId: freezeTarget.trim(),
        bankName,
        requestingOfficer: officerName,
        caseReference,
      });
      setFreezeResult(resp);
    } catch (e: any) {
      setError(e.message || 'Freeze requisition generation failed');
    } finally {
      setFreezeLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm">
        <span className="text-[11px] font-data-mono font-bold uppercase tracking-wider text-outline">
          STATUTORY &amp; FORENSIC LEGAL DOCUMENTATION PIPELINE
        </span>
        <h1 className="font-headline-lg text-2xl font-bold text-on-surface mt-0.5">
          Deterministic Document Generator
        </h1>
        <p className="text-[12px] text-on-surface-variant font-data-mono mt-0.5">
          Generates court-ready Case Diaries and Bank Freeze Requisitions (Sec. 102 CrPC / BNSS) from validated DuckDB evidence.
          No fabricated narrative fields. Officer review &amp; manual signature required.
        </p>

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-[12px] rounded-lg flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Card 1: Case Diary */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            <h2 className="font-headline-md text-base font-bold text-on-surface">
              Case Diary (Forensic Investigation)
            </h2>
          </div>
          <p className="text-[12px] text-on-surface-variant">
            Chronological, deterministic money-trail report linking all 4 hops, layer candidates, and SHA-256 evidence items.
          </p>

          <div className="space-y-2.5 text-[12px] font-data-mono">
            <div>
              <label className="text-outline uppercase text-[10px] block mb-1">VICTIM ACCOUNT ID</label>
              <input
                type="text"
                value={diaryVictim}
                onChange={(e) => setDiaryVictim(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded px-3 py-1.5 text-on-surface"
              />
            </div>
            <div>
              <label className="text-outline uppercase text-[10px] block mb-1">INVESTIGATING OFFICER</label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded px-3 py-1.5 text-on-surface"
              />
            </div>
            <div>
              <label className="text-outline uppercase text-[10px] block mb-1">OFFICER DESIGNATION / CELL</label>
              <input
                type="text"
                value={officerDesignation}
                onChange={(e) => setOfficerDesignation(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded px-3 py-1.5 text-on-surface"
              />
            </div>
            <div>
              <label className="text-outline uppercase text-[10px] block mb-1">CASE REFERENCE (FIR)</label>
              <input
                type="text"
                value={caseReference}
                onChange={(e) => setCaseReference(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded px-3 py-1.5 text-on-surface"
              />
            </div>
          </div>

          <button
            onClick={handleGenerateDiary}
            disabled={diaryLoading}
            className="w-full py-2 bg-primary-container hover:bg-black text-on-primary font-bold text-[12px] rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {diaryLoading ? 'Compiling Evidence & PDF...' : 'Generate Case Diary PDF'}
          </button>

          {diaryResult && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] font-data-mono space-y-1">
              <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Case Diary Ready: {diaryResult.document_id}
              </div>
              <div className="text-outline truncate">Path: {diaryResult.file_path}</div>
              <div className="text-outline truncate">SHA-256: {diaryResult.integrity_hash}</div>
            </div>
          )}
        </div>

        {/* Card 2: Freeze Requisition */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-rose-600" />
            <h2 className="font-headline-md text-base font-bold text-on-surface">
              Bank Freeze Requisition (Sec. 102)
            </h2>
          </div>
          <p className="text-[12px] text-on-surface-variant">
            Contains <strong>ONLY verified account, IFSC, and transaction amounts</strong> from DuckDB. Requires manual IO review before dispatch.
          </p>

          <div className="space-y-2.5 text-[12px] font-data-mono">
            <div>
              <label className="text-outline uppercase text-[10px] block mb-1">TARGET MULE ACCOUNT ID</label>
              <input
                type="text"
                value={freezeTarget}
                onChange={(e) => setFreezeTarget(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded px-3 py-1.5 text-on-surface"
              />
            </div>
            <div>
              <label className="text-outline uppercase text-[10px] block mb-1">TARGET BANK / BRANCH</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded px-3 py-1.5 text-on-surface"
              />
            </div>
            <div>
              <label className="text-outline uppercase text-[10px] block mb-1">AUTHORIZING OFFICER</label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded px-3 py-1.5 text-on-surface"
              />
            </div>
            <div>
              <label className="text-outline uppercase text-[10px] block mb-1">CASE REFERENCE (FIR)</label>
              <input
                type="text"
                value={caseReference}
                onChange={(e) => setCaseReference(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded px-3 py-1.5 text-on-surface"
              />
            </div>
          </div>

          <button
            onClick={handleGenerateFreeze}
            disabled={freezeLoading}
            className="w-full py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-[12px] rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {freezeLoading ? 'Drafting Requisition...' : 'Generate Sec. 102 Freeze Draft PDF'}
          </button>

          {freezeResult && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] font-data-mono space-y-1">
              <div className="flex items-center gap-1.5 text-rose-900 font-bold">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Draft Created: {freezeResult.document_id}
              </div>
              <div className="text-outline truncate">Path: {freezeResult.file_path}</div>
              <div className="text-outline truncate">SHA-256: {freezeResult.integrity_hash}</div>
              <div className="text-[10px] text-rose-700 font-bold pt-1">
                ⚠️ OFFICER APPROVAL REQUIRED • NO AUTOMATIC BANK DISPATCH
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
