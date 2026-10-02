import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { DocumentResponse } from '../api';
import { ShieldAlert, Download, FileText, CheckCircle2, AlertCircle, Trash2, ArrowUpRight } from 'lucide-react';

interface DocumentsViewProps {
  initialAccountId?: string;
  onInvestigateAccount?: (accountId: string) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  initialAccountId,
  onInvestigateAccount,
}) => {
  // Freeze requisition state
  const [freezeTarget, setFreezeTarget] = useState(initialAccountId || '');
  const [bankName, setBankName] = useState('');
  const [officerName, setOfficerName] = useState('Cyber Crime Cell / Investigating Officer');
  const [caseReference, setCaseReference] = useState('');
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [latestGenerated, setLatestGenerated] = useState<{
    doc: DocumentResponse;
    target: string;
    bank?: string;
  } | null>(null);

  // Case diary state (secondary statutory tool)
  const [showCaseDiarySection, setShowCaseDiarySection] = useState(false);
  const [diaryVictim, setDiaryVictim] = useState('');
  const [diaryLoading, setDiaryLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Real generated documents list with localStorage persistence across refreshes
  const [generatedDocs, setGeneratedDocs] = useState<Array<{
    type: 'freeze_requisition' | 'case_diary';
    target: string;
    doc: DocumentResponse;
    bank?: string;
    timestamp?: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem('anvitrace_generated_documents');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync initialAccountId if passed or updated
  useEffect(() => {
    if (initialAccountId) {
      setFreezeTarget(initialAccountId);
      if (!diaryVictim) setDiaryVictim(initialAccountId);
    }
  }, [initialAccountId]);

  // Pre-fill from active case if available
  useEffect(() => {
    try {
      const activeCase = localStorage.getItem('anvitrace_active_case');
      if (activeCase) {
        const c = JSON.parse(activeCase);
        if (c.id && !caseReference) setCaseReference(c.id);
        if (c.targetAccount && !freezeTarget) setFreezeTarget(c.targetAccount);
        if (c.targetAccount && !diaryVictim) setDiaryVictim(c.targetAccount);
      }
    } catch {}
  }, []);

  const saveGeneratedDocs = (docs: Array<{
    type: 'freeze_requisition' | 'case_diary';
    target: string;
    doc: DocumentResponse;
    bank?: string;
    timestamp?: string;
  }>) => {
    setGeneratedDocs(docs);
    try {
      localStorage.setItem('anvitrace_generated_documents', JSON.stringify(docs));
    } catch (e) {
      console.warn('Failed to save documents to localStorage', e);
    }
  };

  const handleClearDocuments = () => {
    if (window.confirm('Clear all stored generated freeze notices and documents?')) {
      saveGeneratedDocs([]);
      setLatestGenerated(null);
    }
  };

  const handleGenerateFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = freezeTarget.trim();
    if (!target) {
      setError('Please enter a target account ID to freeze.');
      return;
    }

    setFreezeLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const resp = await api.generateFreezeRequisition({
        targetAccountId: target,
        bankName: bankName.trim() || undefined,
        requestingOfficer: officerName.trim() || undefined,
        caseReference: caseReference.trim() || undefined,
      });

      const newEntry = {
        type: 'freeze_requisition' as const,
        target: target,
        bank: bankName.trim() || undefined,
        doc: resp,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      const updated = [newEntry, ...generatedDocs];
      saveGeneratedDocs(updated);
      setLatestGenerated({ doc: resp, target, bank: bankName.trim() || undefined });
      setSuccessMsg(`Section 102 CrPC Freeze Notice successfully synthesized for account: ${target}`);
    } catch (err: any) {
      setError(`Failed to generate bank freeze notice: ${err.message}`);
    } finally {
      setFreezeLoading(false);
    }
  };

  const handleGenerateDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diaryVictim.trim()) {
      setError('Please enter a victim account ID.');
      return;
    }

    setDiaryLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const resp = await api.generateCaseDiary({
        victimAccount: diaryVictim.trim(),
        officerName: officerName.trim() || undefined,
        caseReference: caseReference.trim() || undefined,
      });

      const updated = [
        {
          type: 'case_diary' as const,
          target: diaryVictim.trim(),
          doc: resp,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
        ...generatedDocs,
      ];
      saveGeneratedDocs(updated);
      setSuccessMsg(`Case Diary compiled successfully for victim account: ${diaryVictim.trim()}`);
    } catch (err: any) {
      setError(`Case diary generation failed: ${err.message}`);
    } finally {
      setDiaryLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 select-none max-w-7xl mx-auto">
      {/* Header Deck */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-data-mono font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              LEGAL NOTICE ENGINE • SEC. 102 CrPC
            </span>
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface mt-2">
              Bank Freeze Notice Generator
            </h1>
            <p className="text-xs text-on-surface-variant font-data-mono mt-1">
              Issue court-admissible debit freeze requisitions directly to Bank Nodal Officers. Enter the suspect account ID to produce an official Section 102 CrPC PDF notice with cryptographic SHA-256 seal.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-data-mono font-bold flex items-center gap-1.5">
              <CheckCircle2 size={14} /> PDF GENERATION READY
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-data-mono">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-data-mono">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Primary Section: Bank Freeze Notice Generator */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-rose-500/20 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h2 className="font-headline-md text-base font-bold text-on-surface">
                Generate Section 102 CrPC Account Freeze Requisition
              </h2>
              <p className="text-[11px] text-on-surface-variant font-data-mono">
                Mandatory statutory notice directing the bank to freeze all debit transactions on the recipient mule account immediately.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCaseDiarySection(!showCaseDiarySection)}
            className="text-xs font-data-mono text-outline hover:text-on-surface underline hover:no-underline"
          >
            {showCaseDiarySection ? 'Hide Rule 172 Case Diary' : 'Switch / View Rule 172 Case Diary'}
          </button>
        </div>

        <form onSubmit={handleGenerateFreeze} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-data-mono">
            {/* Target Account */}
            <div className="md:col-span-2 lg:col-span-1">
              <label className="text-on-surface font-semibold text-[11px] block mb-1">
                TARGET ACCOUNT ID <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={freezeTarget}
                onChange={(e) => setFreezeTarget(e.target.value)}
                placeholder="e.g. ACC_48291"
                className="w-full p-2.5 bg-surface-container-low border border-rose-300 rounded-lg text-on-surface font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <span className="text-[10px] text-outline mt-1 block">Account to be debited-frozen</span>
            </div>

            {/* Target Bank Name */}
            <div>
              <label className="text-on-surface font-semibold text-[11px] block mb-1">
                BANK NAME (OPTIONAL)
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. State Bank of India / HDFC Bank"
                className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-[10px] text-outline mt-1 block">Nodal Bank recipient</span>
            </div>

            {/* Officer Name */}
            <div>
              <label className="text-on-surface font-semibold text-[11px] block mb-1">
                INVESTIGATING OFFICER
              </label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                placeholder="Officer Name / Cyber Cell..."
                className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-[10px] text-outline mt-1 block">Signatory officer</span>
            </div>

            {/* Case Reference */}
            <div>
              <label className="text-on-surface font-semibold text-[11px] block mb-1">
                CASE REFERENCE / FIR
              </label>
              <input
                type="text"
                value={caseReference}
                onChange={(e) => setCaseReference(e.target.value)}
                placeholder="e.g. CR-2026-0881"
                className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-[10px] text-outline mt-1 block">Police docket reference</span>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={freezeLoading || !freezeTarget.trim()}
              className="px-6 py-3 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <ShieldAlert size={16} />
              <span>{freezeLoading ? 'Synthesizing PDF Notice...' : 'Generate Bank Freeze Notice (Sec. 102 PDF)'}</span>
            </button>
          </div>
        </form>

        {/* Latest Generated Callout Banner */}
        {latestGenerated && (
          <div className="mt-4 p-5 bg-gradient-to-r from-rose-50/70 via-slate-50 to-blue-50/50 border border-rose-300 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-700" />
                <span className="text-xs font-bold text-on-surface uppercase font-data-mono">
                  Official Freeze Notice Synthesized: {latestGenerated.doc.document_id}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-data-mono">
                Target: <strong className="text-rose-700">{latestGenerated.target}</strong>
                {latestGenerated.bank ? ` • Bank: ${latestGenerated.bank}` : ''} • SHA-256:{' '}
                <span className="text-[11px] text-outline">{latestGenerated.doc.integrity_hash?.slice(0, 16)}...</span>
              </p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <a
                href={api.getDocumentDownloadUrl(latestGenerated.doc.document_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-initial px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Download size={14} />
                <span>Download Notice PDF</span>
              </a>
              {onInvestigateAccount && (
                <button
                  type="button"
                  onClick={() => onInvestigateAccount(latestGenerated.target)}
                  className="px-4 py-2.5 bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 text-on-surface rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>Deep-Dive ID</span>
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Secondary Section: Case Diary Generator (Collapsed by default) */}
      {showCaseDiarySection && (
        <form onSubmit={handleGenerateDiary} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-secondary" />
            <h2 className="font-headline-md text-base font-bold text-on-surface">
              Investigation Case Diary (Rule 172 CrPC)
            </h2>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Synthesizes a deterministic chronological money-movement ledger linking all hops, evidence record references, and legal statements.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-data-mono">
            <div>
              <label className="text-outline uppercase text-[10px] block mb-1">VICTIM ACCOUNT ID *</label>
              <input
                type="text"
                value={diaryVictim}
                onChange={(e) => setDiaryVictim(e.target.value)}
                placeholder="Enter victim account..."
                className="w-full p-2.5 bg-surface-container-low border border-outline-variant/50 rounded-lg text-on-surface focus:outline-none"
              />
            </div>
            <div>
              <label className="text-outline uppercase text-[10px] block mb-1">OFFICER NAME</label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                placeholder="Officer Name..."
                className="w-full p-2.5 bg-surface-container-low border border-outline-variant/50 rounded-lg text-on-surface focus:outline-none"
              />
            </div>
            <div>
              <label className="text-outline uppercase text-[10px] block mb-1">CASE REFERENCE</label>
              <input
                type="text"
                value={caseReference}
                onChange={(e) => setCaseReference(e.target.value)}
                placeholder="FIR / Case Reference..."
                className="w-full p-2.5 bg-surface-container-low border border-outline-variant/50 rounded-lg text-on-surface focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={diaryLoading || !diaryVictim.trim()}
              className="px-5 py-2.5 bg-primary-container hover:bg-black text-on-primary rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <FileText size={14} />
              <span>{diaryLoading ? 'Generating Case Diary...' : 'Compile Case Diary (Rule 172 PDF)'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Generated Documents Register & Download Vault */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-secondary">inventory_2</span>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">
              Generated Bank Freeze Notices & Statutory Records ({generatedDocs.length})
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-data-mono text-outline">
              Persistent Court Docket Vault
            </span>
            {generatedDocs.length > 0 && (
              <button
                type="button"
                onClick={handleClearDocuments}
                className="text-[11px] font-data-mono text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Clear Vault</span>
              </button>
            )}
          </div>
        </div>

        {generatedDocs.length === 0 ? (
          <div className="p-12 text-center text-xs text-on-surface-variant font-data-mono">
            No bank freeze notices generated yet. Enter an Account ID above to synthesize an official Section 102 CrPC PDF notice.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-data-mono">
              <thead className="bg-slate-50 border-b border-outline-variant/20 text-outline uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">DOCUMENT ID</th>
                  <th className="py-3 px-4">TYPE</th>
                  <th className="py-3 px-4">TARGET ACCOUNT</th>
                  <th className="py-3 px-4">BANK / RECIPIENT</th>
                  <th className="py-3 px-4">GENERATED AT</th>
                  <th className="py-3 px-4">SHA-256 HASH</th>
                  <th className="py-3 px-4 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 text-on-surface">
                {generatedDocs.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-primary">{item.doc.document_id}</td>
                    <td className="py-3 px-4 font-semibold">
                      {item.type === 'freeze_requisition' ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                          Sec. 102 Freeze Notice
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                          Rule 172 Case Diary
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-on-surface">
                      <div className="flex items-center gap-1.5">
                        <span>{item.target}</span>
                        {onInvestigateAccount && (
                          <button
                            type="button"
                            onClick={() => onInvestigateAccount(item.target)}
                            className="text-primary hover:text-primary-container p-0.5"
                            title="Deep-dive this account"
                          >
                            <ArrowUpRight size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-outline">{item.bank || 'National Bank Nodal'}</td>
                    <td className="py-3 px-4 text-outline">{item.timestamp || 'Just now'}</td>
                    <td className="py-3 px-4 text-on-surface-variant font-mono">
                      {item.doc.integrity_hash ? `${item.doc.integrity_hash.slice(0, 16)}...` : 'Verified'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <a
                        href={api.getDocumentDownloadUrl(item.doc.document_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded text-[11px] font-bold shadow-sm transition-colors"
                      >
                        <Download size={12} />
                        <span>PDF Notice</span>
                      </a>
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
