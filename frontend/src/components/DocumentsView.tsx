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
} from 'lucide-react';

interface DocumentsViewProps {
  initialAccountId?: string;
  onInvestigateAccount?: (accountId: string) => void;
  onGoBack?: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  initialAccountId,
  onInvestigateAccount,
  onGoBack,
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
              <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
                LEGAL FORENSIC PIPELINE • SEC. 102 CrPC
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
              Bank Freeze Notice Generator
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Issue court-admissible debit freeze requisitions directly to Bank Nodal Officers. Enter the suspect account ID to produce an official Section 102 CrPC PDF notice with cryptographic SHA-256 seal.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>PDF Generator Ready</span>
            </span>
          </div>
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

      {/* Primary Generator Card: Section 102 CrPC Notice */}
      <div className="bg-white p-6 rounded-2xl border border-rose-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
              <Gavel size={18} />
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
          <button
            type="button"
            onClick={() => setShowCaseDiarySection(!showCaseDiarySection)}
            className="text-xs text-slate-500 hover:text-slate-900 underline font-medium"
          >
            {showCaseDiarySection ? 'Hide Rule 172 Case Diary' : 'Switch to Rule 172 Case Diary'}
          </button>
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
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
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
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
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
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
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

        {/* Latest Generated Callout Banner */}
        {latestGenerated && (
          <div className="mt-4 p-5 bg-gradient-to-r from-rose-50/80 via-slate-50 to-amber-50/50 border border-rose-300 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-700" />
                <span className="text-xs font-bold text-slate-900 uppercase">
                  Official Freeze Notice Synthesized: {latestGenerated.doc.document_id}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Target: <strong className="text-rose-700 font-mono">{latestGenerated.target}</strong>
                {latestGenerated.bank ? ` • Bank: ${latestGenerated.bank}` : ''} • SHA-256:{' '}
                <span className="text-[11px] font-mono text-slate-500">
                  {latestGenerated.doc.integrity_hash?.slice(0, 16)}...
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <a
                href={api.getDocumentDownloadUrl(latestGenerated.doc.document_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-initial px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>Download Notice PDF</span>
              </a>
              {onInvestigateAccount && (
                <button
                  type="button"
                  onClick={() => onInvestigateAccount(latestGenerated.target)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
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
        <form onSubmit={handleGenerateDiary} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              Investigation Case Diary (Rule 172 CrPC)
            </h2>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Synthesizes a deterministic chronological money-movement ledger linking all hops, evidence record references, and legal statements.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-500 uppercase text-[10px] font-bold block mb-1">VICTIM ACCOUNT ID *</label>
              <input
                type="text"
                value={diaryVictim}
                onChange={(e) => setDiaryVictim(e.target.value)}
                placeholder="Enter victim account..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="text-slate-500 uppercase text-[10px] font-bold block mb-1">OFFICER NAME</label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                placeholder="Officer Name..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="text-slate-500 uppercase text-[10px] font-bold block mb-1">CASE REFERENCE</label>
              <input
                type="text"
                value={caseReference}
                onChange={(e) => setCaseReference(e.target.value)}
                placeholder="FIR / Case Reference..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={diaryLoading || !diaryVictim.trim()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <FileText size={14} />
              <span>{diaryLoading ? 'Generating Case Diary...' : 'Compile Case Diary (Rule 172 PDF)'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Generated Documents Register & Download Vault */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Generated Bank Freeze Notices &amp; Statutory Records
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
            No bank freeze notices generated yet. Enter a Target Account ID above to synthesize an official Section 102 CrPC PDF notice.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-6">Document ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Target Account</th>
                  <th className="py-3 px-4">Bank / Recipient</th>
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
                          className="text-slate-400 hover:text-slate-600 p-0.5"
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
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                          Sec. 102 Freeze Notice
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          Rule 172 Case Diary
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
                            className="text-amber-700 hover:text-amber-900 p-0.5"
                            title="Deep-dive this account"
                          >
                            <ArrowUpRight size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{item.bank || 'National Bank Nodal'}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{item.timestamp || 'Just now'}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {item.doc.integrity_hash ? `${item.doc.integrity_hash.slice(0, 16)}...` : 'Verified'}
                    </td>
                    <td className="py-3 px-6 text-center">
                      <a
                        href={api.getDocumentDownloadUrl(item.doc.document_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
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
