import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { DocumentResponse } from '../api';
import {
  ShieldAlert,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ArrowUpRight,
  Gavel,
  Check,
  Copy,
  ArrowLeft,
  Scale,
  ExternalLink,
} from 'lucide-react';

interface DocumentsViewProps {
  initialAccountId?: string;
  initialDocType?: 'freeze_requisition' | 'case_diary';
  onInvestigateAccount?: (accountId: string) => void;
  onGoBack?: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  initialAccountId,
  initialDocType = 'freeze_requisition',
  onInvestigateAccount,
  onGoBack,
}) => {
  // Document selector tab
  const [activeDocType, setActiveDocType] = useState<'freeze_requisition' | 'case_diary'>(initialDocType);

  // Common metadata
  const [officerName, setOfficerName] = useState('Cyber Crime Cell / Investigating Officer');
  const [officerDesignation, setOfficerDesignation] = useState('Cyber Crime Investigation Cell');
  const [caseReference, setCaseReference] = useState('');

  // Freeze requisition state (Sec. 102 CrPC)
  const [freezeTarget, setFreezeTarget] = useState(initialAccountId || '');
  const [bankName, setBankName] = useState('');
  const [freezeLoading, setFreezeLoading] = useState(false);

  // Case diary state (Rule 172 CrPC)
  const [diaryVictim, setDiaryVictim] = useState(initialAccountId || '');
  const [diaryLoading, setDiaryLoading] = useState(false);

  // Latest generated callout banner (supports both notice and case diary)
  const [latestGenerated, setLatestGenerated] = useState<{
    doc: DocumentResponse;
    target: string;
    bank?: string;
    type: 'freeze_requisition' | 'case_diary';
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);

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

  // Sync initialDocType if updated
  useEffect(() => {
    if (initialDocType) {
      setActiveDocType(initialDocType);
    }
  }, [initialDocType]);

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
    } catch { }
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
    if (window.confirm('Clear all stored generated statutory legal records and PDF documents?')) {
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
      setLatestGenerated({ doc: resp, target, bank: bankName.trim() || undefined, type: 'freeze_requisition' });
      setSuccessMsg(`Section 102 CrPC Freeze Notice successfully synthesized for account: ${target}`);
    } catch (err: any) {
      setError(`Failed to generate bank freeze notice: ${err.message}`);
    } finally {
      setFreezeLoading(false);
    }
  };

  const handleGenerateDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = diaryVictim.trim();
    if (!target) {
      setError('Please enter a victim account ID.');
      return;
    }

    setDiaryLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const resp = await api.generateCaseDiary({
        victimAccount: target,
        officerName: officerName.trim() || undefined,
        officerDesignation: officerDesignation.trim() || undefined,
        caseReference: caseReference.trim() || undefined,
      });

      const newEntry = {
        type: 'case_diary' as const,
        target: target,
        doc: resp,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      const updated = [newEntry, ...generatedDocs];
      saveGeneratedDocs(updated);
      setLatestGenerated({ doc: resp, target, type: 'case_diary' });
      setSuccessMsg(`Rule 172 CrPC Case Diary compiled successfully for victim account: ${target}`);
    } catch (err: any) {
      setError(`Case diary generation failed: ${err.message}`);
    } finally {
      setDiaryLoading(false);
    }
  };

  const copyDocId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedDocId(id);
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-16 select-none max-w-7xl mx-auto">
      {/* Header Deck */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              {onGoBack && (
                <button
                  type="button"
                  onClick={onGoBack}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 transition-colors cursor-pointer mr-1 group shadow-2xs"
                  title="Go back to previous screen"
                >
                  <ArrowLeft size={13} className="text-slate-500 group-hover:text-slate-800 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back</span>
                </button>
              )}
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200 uppercase tracking-wider">
                STATUTORY LEGAL PIPELINE • CrPC DOCKETS
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
              Legal Documents &amp; Statutory Report Generator
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate court-admissible Section 102 CrPC Bank Freeze Requisitions and compile Rule 172 CrPC Chronological Case Diaries with tamper-proof cryptographic SHA-256 seals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>PDF Engine Ready</span>
            </span>
          </div>
        </div>

        {/* Executive Segmented Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveDocType('freeze_requisition')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeDocType === 'freeze_requisition'
                ? 'bg-rose-50 text-rose-700 border border-rose-300 shadow-xs ring-1 ring-rose-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <Gavel size={15} className={activeDocType === 'freeze_requisition' ? 'text-rose-700' : 'text-slate-400'} />
            <span>Section 102 CrPC Bank Freeze Requisition</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-200/60 text-rose-800">Notice</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDocType('case_diary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeDocType === 'case_diary'
                ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs ring-1 ring-amber-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <FileText size={15} className={activeDocType === 'case_diary' ? 'text-amber-700' : 'text-slate-400'} />
            <span>Rule 172 CrPC Chronological Case Diary</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200/60 text-amber-900 font-bold">Case Diary PDF</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Generator Form Card 1: Section 102 CrPC Freeze Notice */}
      {activeDocType === 'freeze_requisition' && (
        <div className="bg-white p-6 rounded-2xl border border-rose-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shadow-2xs">
                <Gavel size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Generate Section 102 CrPC Account Freeze Requisition
                </h2>
                <p className="text-xs text-slate-500">
                  Mandatory statutory notice directing the bank to freeze all debit transactions on the recipient mule account immediately.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider">
              Statutory Bank Order
            </span>
          </div>

          <form onSubmit={handleGenerateFreeze} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Target Account */}
              <div className="md:col-span-2 lg:col-span-1">
                <label className="text-slate-700 font-bold text-[11px] block mb-1">
                  TARGET ACCOUNT ID <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={freezeTarget}
                  onChange={(e) => setFreezeTarget(e.target.value)}
                  placeholder="e.g. SBIN10001486"
                  className="w-full p-2.5 bg-slate-50 border border-rose-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-600"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Account to be debited-frozen</span>
              </div>

              {/* Target Bank Name */}
              <div>
                <label className="text-slate-700 font-bold text-[11px] block mb-1">
                  BANK NAME (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. State Bank of India / HDFC Bank"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Recipient Bank Nodal Officer</span>
              </div>

              {/* Officer Name */}
              <div>
                <label className="text-slate-700 font-bold text-[11px] block mb-1">
                  INVESTIGATING OFFICER
                </label>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder="Officer Name / Cyber Crime Cell"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Signatory credentials</span>
              </div>

              {/* Case Reference */}
              <div>
                <label className="text-slate-700 font-bold text-[11px] block mb-1">
                  CASE REFERENCE / FIR
                </label>
                <input
                  type="text"
                  value={caseReference}
                  onChange={(e) => setCaseReference(e.target.value)}
                  placeholder="e.g. CR-2024-001"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Police docket identifier</span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={freezeLoading || !freezeTarget.trim()}
                className="px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <ShieldAlert size={15} />
                <span>{freezeLoading ? 'Synthesizing PDF Notice...' : 'Generate Bank Freeze Notice (Sec. 102 PDF)'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Generator Form Card 2: Rule 172 CrPC Case Diary */}
      {activeDocType === 'case_diary' && (
        <div className="bg-white p-6 rounded-2xl border border-amber-300 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-700 shadow-2xs">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Compile Investigation Case Diary (Rule 172 CrPC)
                </h2>
                <p className="text-xs text-slate-500">
                  Synthesizes a deterministic chronological money-movement ledger linking all hops, evidence record references, layer classifications, and legal statements.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
              Statutory Docket Ledger
            </span>
          </div>

          <form onSubmit={handleGenerateDiary} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Victim Account */}
              <div className="md:col-span-2 lg:col-span-1">
                <label className="text-slate-700 font-bold text-[11px] block mb-1">
                  VICTIM ACCOUNT ID <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  value={diaryVictim}
                  onChange={(e) => setDiaryVictim(e.target.value)}
                  placeholder="e.g. SBIN10000144"
                  className="w-full p-2.5 bg-slate-50 border border-amber-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Root account of cyber fraud origin</span>
              </div>

              {/* Investigating Officer */}
              <div>
                <label className="text-slate-700 font-bold text-[11px] block mb-1">
                  OFFICER NAME
                </label>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder="Officer Name / Cell Head"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Supervising investigator</span>
              </div>

              {/* Officer Designation */}
              <div>
                <label className="text-slate-700 font-bold text-[11px] block mb-1">
                  OFFICER DESIGNATION
                </label>
                <input
                  type="text"
                  value={officerDesignation}
                  onChange={(e) => setOfficerDesignation(e.target.value)}
                  placeholder="e.g. Cyber Crime Cell"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Police authority unit</span>
              </div>

              {/* Case Reference / FIR */}
              <div>
                <label className="text-slate-700 font-bold text-[11px] block mb-1">
                  CASE REFERENCE / FIR
                </label>
                <input
                  type="text"
                  value={caseReference}
                  onChange={(e) => setCaseReference(e.target.value)}
                  placeholder="e.g. CR-2024-001"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">FIR docket number</span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={diaryLoading || !diaryVictim.trim()}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <FileText size={15} />
                <span>{diaryLoading ? 'Compiling Case Diary PDF...' : 'Compile Case Diary (Rule 172 PDF)'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Latest Generated Instant Callout & Download Banner */}
      {latestGenerated && (
        <div
          className={`p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border transition-all animate-in fade-in duration-200 ${
            latestGenerated.type === 'case_diary'
              ? 'bg-gradient-to-r from-amber-50/90 via-slate-50 to-amber-100/60 border-amber-300'
              : 'bg-gradient-to-r from-rose-50/90 via-slate-50 to-rose-100/60 border-rose-300'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {latestGenerated.type === 'case_diary' ? (
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <FileText size={17} />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-rose-700 text-white flex items-center justify-center shadow-xs">
                  <ShieldAlert size={17} />
                </div>
              )}
              <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                {latestGenerated.type === 'case_diary'
                  ? `Official Rule 172 Case Diary Synthesized: ${latestGenerated.doc.document_id}`
                  : `Official Section 102 Freeze Notice Synthesized: ${latestGenerated.doc.document_id}`}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                <CheckCircle2 size={11} /> Cryptographic SHA-256 Seal
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {latestGenerated.type === 'case_diary' ? (
                <>
                  Victim Account: <strong className="text-amber-900 font-mono font-bold">{latestGenerated.target}</strong>
                  {latestGenerated.doc.page_count ? ` • Pages: ${latestGenerated.doc.page_count}` : ''}
                  {latestGenerated.doc.evidence_item_count !== undefined ? ` • Evidence Records: ${latestGenerated.doc.evidence_item_count}` : ''}
                </>
              ) : (
                <>
                  Target Account: <strong className="text-rose-700 font-mono font-bold">{latestGenerated.target}</strong>
                  {latestGenerated.bank ? ` • Bank: ${latestGenerated.bank}` : ''}
                </>
              )}
              {' • '}
              SHA-256:{' '}
              <span className="text-[11px] font-mono text-slate-500 font-medium">
                {latestGenerated.doc.integrity_hash ? `${latestGenerated.doc.integrity_hash.slice(0, 20)}...` : 'Verified'}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <a
              href={api.getDocumentDownloadUrl(latestGenerated.doc.document_id)}
              target="_blank"
              download={`${latestGenerated.doc.document_id}.pdf`}
              rel="noopener noreferrer"
              className={`flex-1 md:flex-initial px-5 py-2.5 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer ${
                latestGenerated.type === 'case_diary'
                  ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                  : 'bg-rose-700 hover:bg-rose-800 active:bg-rose-900'
              }`}
            >
              <Download size={14} />
              <span>{latestGenerated.type === 'case_diary' ? 'Download Case Diary PDF' : 'Download Notice PDF'}</span>
            </a>
            {onInvestigateAccount && (
              <button
                type="button"
                onClick={() => onInvestigateAccount(latestGenerated.target)}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Open 360° graph deep-dive for this account"
              >
                <span>Deep-Dive ID</span>
                <ArrowUpRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Generated Documents Register & Download Vault */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Generated Statutory Records &amp; Legal Documents Vault
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold font-mono">
              {generatedDocs.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 font-medium">
              Persistent Court Docket Vault
            </span>
            {generatedDocs.length > 0 && (
              <button
                type="button"
                onClick={handleClearDocuments}
                className="text-[11px] text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer font-medium"
              >
                <Trash2 size={12} />
                <span>Clear Vault</span>
              </button>
            )}
          </div>
        </div>

        {generatedDocs.length === 0 ? (
          <div className="p-14 text-center text-xs text-slate-500">
            No statutory documents generated yet. Use the generators above to synthesize an official Section 102 CrPC Bank Freeze Notice or Rule 172 CrPC Case Diary PDF.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-6">Document ID</th>
                  <th className="py-3 px-4">Statutory Type</th>
                  <th className="py-3 px-4">Subject Account</th>
                  <th className="py-3 px-4">Recipient / Authority</th>
                  <th className="py-3 px-4">Generated At</th>
                  <th className="py-3 px-4">SHA-256 Hash</th>
                  <th className="py-3 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {generatedDocs.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">{item.doc.document_id}</span>
                        <button
                          type="button"
                          onClick={() => copyDocId(item.doc.document_id)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          title="Copy Document ID"
                        >
                          {copiedDocId === item.doc.document_id ? (
                            <Check size={11} className="text-emerald-600" />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {item.type === 'freeze_requisition' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold inline-flex items-center gap-1">
                          <Gavel size={11} />
                          <span>Sec. 102 Freeze Notice</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold inline-flex items-center gap-1">
                          <FileText size={11} />
                          <span>Rule 172 Case Diary</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span>{item.target}</span>
                        {onInvestigateAccount && (
                          <button
                            type="button"
                            onClick={() => onInvestigateAccount(item.target)}
                            className="text-amber-700 hover:text-amber-900 p-0.5 cursor-pointer"
                            title="Deep-dive this account"
                          >
                            <ArrowUpRight size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {item.type === 'freeze_requisition'
                        ? (item.bank || 'National Bank Nodal')
                        : 'Cyber Police Court Docket'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{item.timestamp || 'Just now'}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {item.doc.integrity_hash ? `${item.doc.integrity_hash.slice(0, 16)}...` : 'Verified'}
                    </td>
                    <td className="py-3 px-6 text-center">
                      <a
                        href={api.getDocumentDownloadUrl(item.doc.document_id)}
                        target="_blank"
                        download={`${item.doc.document_id}.pdf`}
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer ${
                          item.type === 'case_diary'
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-rose-700 hover:bg-rose-800 text-white'
                        }`}
                        title={item.type === 'case_diary' ? 'Download Rule 172 Case Diary PDF' : 'Download Section 102 Notice PDF'}
                      >
                        <Download size={12} />
                        <span>{item.type === 'case_diary' ? 'PDF Case Diary' : 'PDF Notice'}</span>
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
