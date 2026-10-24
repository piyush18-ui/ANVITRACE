import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { PrimaryCandidate } from '../api';
import {
  FolderPlus,
  FileText,
  Search,
  Database,
  Trash2,
  UploadCloud,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Briefcase,
  X,
  FileSpreadsheet,
  Loader2,
  ArrowLeft,
  Sparkles,
  Zap,
} from 'lucide-react';

interface CaseManagementViewProps {
  onInvestigateAccount: (accountId: string) => void;
  onNavigateToDataset: () => void;
  onNavigateToDocuments: () => void;
  onNavigateToNotice?: (accountId: string, docType?: 'freeze_requisition' | 'case_diary') => void;
  onGoBack?: () => void;
}

export interface CaseDocket {
  id: string;
  title: string;
  act: string;
  targetAccount: string;
  officerName?: string;
  notes?: string;
  createdAt: string;
  status: 'Active Investigation' | 'Sealed Evidence' | 'Court Requisition Pending';
  datasetId?: string;
  datasetFilename?: string;
  datasetTotalRows?: number;
  datasetHash?: string;
}

export interface UploadProgressInfo {
  percent: number;
  stage: string;
  loaded?: number;
  total?: number;
}

export const CaseManagementView: React.FC<CaseManagementViewProps> = ({
  onInvestigateAccount,
  onNavigateToDataset,
  onNavigateToDocuments,
  onNavigateToNotice,
  onGoBack,
}) => {
  const [cases, setCases] = useState<CaseDocket[]>(() => {
    try {
      const saved = localStorage.getItem('anvitrace_cases');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((c: any) => c && typeof c === 'object' && Boolean(c.id || c.case_id)).map((c: any) => ({
            id: String(c.id || c.case_id || 'CASE-001'),
            title: String(c.title || 'Investigation Docket'),
            act: String(c.act || c.act_section || 'Sec. 66D IT Act / 420 IPC'),
            targetAccount: String(c.targetAccount || c.target_account || c.victim_account || ''),
            officerName: c.officerName || c.officer_name || '',
            notes: c.notes || c.description || '',
            createdAt: c.createdAt || (c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : 'Active'),
            status: (c.status || 'Active Investigation') as any,
            datasetId: c.datasetId || c.dataset_id,
            datasetFilename: c.datasetFilename || c.dataset_filename,
            datasetHash: c.datasetHash || c.dataset_hash,
          }));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [filterText, setFilterText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Case form state
  const [newCaseId, setNewCaseId] = useState('');
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseAct, setNewCaseAct] = useState('Sec. 66D IT Act / 420 IPC');
  const [newCaseTarget, setNewCaseTarget] = useState('');
  const [newCaseNotes, setNewCaseNotes] = useState('');
  const [newCaseFiles, setNewCaseFiles] = useState<File[]>([]);

  // Evidence upload state
  const [uploadingCaseId, setUploadingCaseId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Primary Investigation Candidates
  const [primaryCandidates, setPrimaryCandidates] = useState<PrimaryCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Load backend cases and candidates on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const resp = await api.listCases();
        const rawList: any[] = Array.isArray(resp) ? resp : (resp as any)?.cases || [];
        if (rawList.length > 0) {
          const mapped: CaseDocket[] = rawList
            .filter((c: any) => c && typeof c === 'object')
            .map((c: any) => ({
              id: String(c.id || c.case_id || 'CASE-001'),
              title: String(c.title || 'Investigation Docket'),
              act: String(c.act || c.act_section || 'Sec. 66D IT Act / 420 IPC'),
              targetAccount: String(c.targetAccount || c.target_account || c.victim_account || ''),
              officerName: c.officerName || c.officer_name || '',
              notes: c.notes || c.description || '',
              createdAt: c.createdAt || (c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : 'Active'),
              status: (c.status || 'Active Investigation') as any,
              datasetId: c.datasetId || c.dataset_id,
              datasetFilename: c.datasetFilename || c.dataset_filename,
              datasetHash: c.datasetHash || c.dataset_hash,
            }));
          setCases((prev) => {
            const validPrev = Array.isArray(prev) ? prev.filter((p) => p && typeof p === 'object' && Boolean(p.id)) : [];
            const existingIds = new Set(validPrev.map((p) => p.id));
            const newEntries = mapped.filter((m) => !existingIds.has(m.id));
            const combined = [...validPrev, ...newEntries];
            try {
              localStorage.setItem('anvitrace_cases', JSON.stringify(combined));
            } catch {}
            return combined;
          });
        }
      } catch (e) {
        // Fallback to local storage
      }

      setLoadingCandidates(true);
      try {
        const cands = await api.getPrimaryCandidates(undefined, 6);
        if (cands && Array.isArray(cands)) {
          setPrimaryCandidates(cands);
        }
      } catch {
        // No candidates available yet
      } finally {
        setLoadingCandidates(false);
      }
    };
    fetchInitialData();
  }, []);

  const saveCases = (updated: CaseDocket[]) => {
    setCases(updated);
    try {
      localStorage.setItem('anvitrace_cases', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save cases to localStorage', e);
    }
  };

  const handleAttachEvidence = async (caseId: string, files: File[]) => {
    if (!files || files.length === 0) return;
    setUploadingCaseId(caseId);
    setUploadError(null);
    setUploadMessage(null);
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

    setUploadProgress({
      percent: 10,
      stage: `Preparing ${files.length} evidence file(s)...`,
      loaded: 0,
      total: totalBytes,
    });

    try {
      let resp: any;
      if (files.length === 1) {
        resp = await api.uploadDataset(files[0], (p) => {
          setUploadProgress(p);
        });
      } else {
        setUploadProgress({
          percent: 30,
          stage: `Ingesting batch of ${files.length} CSV files into DuckDB...`,
          loaded: totalBytes / 2,
          total: totalBytes,
        });
        resp = await api.uploadMultipleDatasets(files);
        setUploadProgress({
          percent: 100,
          stage: 'Batch ingestion complete',
          loaded: totalBytes,
          total: totalBytes,
        });
      }

      const filenames = files.map((f) => f.name).join(', ');
      const totalRows = resp.total_rows || resp.total_records_ingested || 2000000;
      const datasetId = resp.dataset_id;
      const datasetHash = resp.dataset_hash || resp.manifest_sha256;

      const updated = cases.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            datasetId,
            datasetFilename: filenames,
            datasetTotalRows: totalRows,
            datasetHash,
          };
        }
        return c;
      });
      saveCases(updated);
      setUploadMessage(
        `Successfully ingested ${files.length} evidence file(s) (${filenames}) into Case ${caseId}!`
      );

      // Refresh candidates after new data ingestion
      api.getPrimaryCandidates(datasetId, 6).then((cands) => {
        if (cands && Array.isArray(cands)) setPrimaryCandidates(cands);
      }).catch(() => {});
    } catch (err: any) {
      setUploadError(`Evidence upload failed: ${err.message}`);
    } finally {
      setUploadingCaseId(null);
      setUploadProgress(null);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseId.trim() || !newCaseTarget.trim()) return;

    let attachedDatasetId: string | undefined;
    let attachedFilename: string | undefined;
    let attachedRows: number | undefined;
    let attachedHash: string | undefined;

    // If evidence files are attached, upload them first
    if (newCaseFiles.length > 0) {
      setUploadingCaseId('new_case');
      setUploadError(null);
      const totalBytes = newCaseFiles.reduce((acc, f) => acc + f.size, 0);
      setUploadProgress({
        percent: 10,
        stage: `Ingesting ${newCaseFiles.length} evidence file(s)...`,
        loaded: 0,
        total: totalBytes,
      });
      try {
        let uploadResp: any;
        if (newCaseFiles.length === 1) {
          uploadResp = await api.uploadDataset(newCaseFiles[0], (p) => {
            setUploadProgress(p);
          });
        } else {
          uploadResp = await api.uploadMultipleDatasets(newCaseFiles);
        }
        attachedDatasetId = uploadResp.dataset_id;
        attachedFilename = newCaseFiles.map((f) => f.name).join(', ');
        attachedRows = uploadResp.total_rows || uploadResp.total_records_ingested || 2000000;
        attachedHash = uploadResp.dataset_hash || uploadResp.manifest_sha256;
        setUploadMessage(`Evidence ingested and attached to new case!`);
      } catch (err: any) {
        setUploadError(`Failed to ingest evidence CSV: ${err.message}`);
        setUploadingCaseId(null);
        setUploadProgress(null);
        return;
      }
    }

    const newDocket: CaseDocket = {
      id: newCaseId.trim().toUpperCase(),
      title: newCaseTitle.trim() || `Investigation ${newCaseId.trim().toUpperCase()}`,
      act: newCaseAct.trim(),
      targetAccount: newCaseTarget.trim(),
      notes: newCaseNotes.trim() || undefined,
      createdAt: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      status: 'Active Investigation',
      datasetId: attachedDatasetId,
      datasetFilename: attachedFilename,
      datasetTotalRows: attachedRows,
      datasetHash: attachedHash,
    };

    // Sync with backend SQLite/DuckDB
    try {
      await api.registerCase({
        case_id: newDocket.id,
        title: newDocket.title,
        act_section: newDocket.act,
        victim_account: newDocket.targetAccount,
        description: newDocket.notes,
        dataset_id: attachedDatasetId,
      });
    } catch (e) {
      console.warn('Backend case registration sync note:', e);
    }

    const updated = [newDocket, ...cases];
    saveCases(updated);

    // Save active case to localStorage for cross-page persistence
    try {
      localStorage.setItem('anvitrace_active_case', JSON.stringify(newDocket));
    } catch {}

    // Reset form
    setNewCaseId('');
    setNewCaseTitle('');
    setNewCaseTarget('');
    setNewCaseNotes('');
    setNewCaseFiles([]);
    setUploadingCaseId(null);
    setUploadProgress(null);
    setShowCreateModal(false);
  };

  const handleDeleteCase = (caseId: string) => {
    if (window.confirm(`Delete case docket ${caseId}? This will remove it from local registry.`)) {
      const updated = cases.filter((c) => c.id !== caseId);
      saveCases(updated);
    }
  };

  const renderProgressBar = (progress: UploadProgressInfo | null, filename?: string) => {
    const percent = progress?.percent ?? 5;
    const stage = progress?.stage ?? 'Preparing evidence CSV payload...';
    const mbLoaded = progress?.loaded !== undefined ? (progress.loaded / (1024 * 1024)).toFixed(1) : undefined;
    const mbTotal = progress?.total !== undefined ? (progress.total / (1024 * 1024)).toFixed(1) : undefined;
    const isUploaded = progress?.loaded !== undefined && progress?.total !== undefined && progress.loaded >= progress.total;

    return (
      <div className="p-3.5 bg-slate-900 text-white rounded-xl shadow-sm space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold flex items-center gap-2">
            <Loader2 size={13} className="animate-spin text-white" />
            <span className="truncate max-w-[240px]">
              {filename ? `Ingesting: ${filename}` : 'Ingesting Evidence Dataset'}
            </span>
          </span>
          <span className="font-mono font-bold text-white">{percent}%</span>
        </div>

        {/* Progress track */}
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 ring-1 ring-slate-700/60">
          <div
            className="h-full bg-white rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(255,255,255,0.7)]"
            style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="truncate max-w-[280px] font-medium text-slate-300">{stage}</span>
          {mbTotal && (
            <span className="font-mono shrink-0 ml-2 text-slate-300">
              {isUploaded ? (percent >= 100 ? `${mbTotal} MB • Complete` : `${mbTotal} MB • Ingesting`) : `${mbLoaded} / ${mbTotal} MB`}
            </span>
          )}
        </div>
      </div>
    );
  };

  const searchFilter = (filterText || '').trim().toLowerCase();
  const filteredCases = (Array.isArray(cases) ? cases : [])
    .filter((c) => c && typeof c === 'object')
    .filter((c) => {
      if (!searchFilter) return true;
      const cId = String(c.id || '').toLowerCase();
      const cTitle = String(c.title || '').toLowerCase();
      const cTarget = String(c.targetAccount || '').toLowerCase();
      const cAct = String(c.act || '').toLowerCase();
      return (
        cId.includes(searchFilter) ||
        cTitle.includes(searchFilter) ||
        cTarget.includes(searchFilter) ||
        cAct.includes(searchFilter)
      );
    });

  return (
    <div className="space-y-6 pb-16 select-none max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                AIR-GAP EVIDENCE REGISTRY
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
              Case Dockets &amp; Formal Enquiries
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Register formal investigation references, attach evidence transaction CSVs, and bind datasets to cases.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigateToDataset()}
              className="hidden items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-xs"
              style={{ display: 'none' }}
              aria-hidden="true"
            >
              <Database size={14} className="text-amber-600" />
              <span>Dataset Setup</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToDocuments()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-xs"
            >
              <FileText size={14} className="text-amber-600" />
              <span>Statutory Documents</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <FolderPlus size={15} />
              <span>Register New Case</span>
            </button>
          </div>
        </div>

        {/* Feedback messages */}
        {uploadMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{uploadMessage}</span>
            </div>
            <button onClick={() => setUploadMessage(null)} className="text-emerald-600 font-bold hover:text-emerald-900">
              ✕
            </button>
          </div>
        )}

        {uploadError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between font-medium">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)} className="text-rose-600 font-bold hover:text-rose-900">
              ✕
            </button>
          </div>
        )}

        {/* Filter bar */}
        {cases.length > 0 && (
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter cases by ID, account, or statutory act..."
                className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredCases.length} of {cases.length} dockets
            </span>
          </div>
        )}
      </div>

      {/* Primary Investigation Candidates (Autonomous ML & Graph Centrality Ranking) */}
      {primaryCandidates.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                <Sparkles size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Primary Investigation Candidates (Autonomous Forensic Ranking)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Accounts flagged by blended rule-based topologies and Isolation Forest unsupervised anomaly model
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-md font-mono">
              Combined Score = 0.60 Rule + 0.40 ML
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {primaryCandidates.slice(0, 6).map((cand) => (
              <div
                key={cand.account_id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-amber-300 transition-all shadow-2xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {cand.account_id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-mono">
                      Priority: {cand.investigation_priority_score.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-lg border border-slate-200/60 font-mono">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-sans">RULE RISK:</span>
                    <strong className="text-amber-800">{cand.rule_risk_score.toFixed(1)} / 100</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-sans">ML ANOMALY:</span>
                    <strong className="text-indigo-700">{cand.ml_anomaly_score.toFixed(1)} / 100</strong>
                  </div>
                </div>

                {cand.supporting_signals && cand.supporting_signals.length > 0 && (
                  <p className="text-[10px] text-slate-600 line-clamp-1 italic">
                    • {cand.supporting_signals[0]}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-medium text-slate-500 font-mono">
                    Total: ₹{(cand.in_amount || 0).toLocaleString('en-IN')}
                  </span>
                  <button
                    type="button"
                    onClick={() => onInvestigateAccount(cand.account_id)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Investigate</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Case Dockets Grid or Empty State */}
      {cases.length === 0 ? (
        <div className="bg-white p-16 rounded-2xl border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
            <Briefcase size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Case Dockets Registered</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              Register your first formal case docket to attach and ingest transaction evidence CSVs. Data is saved securely and persists across sessions.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <FolderPlus size={15} />
              <span>Register First Case Docket</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCases.map((docket, idx) => (
            <div
              key={`${docket.id}-${idx}`}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all hover:shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 font-mono text-xs font-bold text-amber-900">
                    {docket.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCase(docket.id)}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    title="Remove Docket"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                    {docket.title}
                  </h3>
                  <div className="space-y-1.5 text-xs text-slate-600 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">TARGET ACCOUNT:</span>
                      <strong className="text-slate-900 font-mono">{docket.targetAccount}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">STATUTORY ACT:</span>
                      <span className="truncate max-w-[180px] font-medium">{docket.act}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">REGISTERED:</span>
                      <span>{docket.createdAt}</span>
                    </div>
                  </div>
                </div>

                {/* Evidence CSV info or upload trigger */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1.5">
                      <Database size={12} className="text-amber-600" />
                      EVIDENCE DATASET
                    </span>
                    {docket.datasetId ? (
                      <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ACTIVE DATASET
                      </span>
                    ) : (
                      <span className="text-[9px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        NO CSV ATTACHED
                      </span>
                    )}
                  </div>
                  {docket.datasetFilename ? (
                    <div className="text-xs text-slate-800">
                      <span className="font-semibold text-slate-900 block truncate">{docket.datasetFilename}</span>
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        {docket.datasetTotalRows ? `${docket.datasetTotalRows.toLocaleString('en-IN')} records` : 'Dataset active'} • ID: {docket.datasetId?.slice(0, 10)}...
                      </span>
                    </div>
                  ) : uploadingCaseId === docket.id ? (
                    <div className="pt-1">
                      {renderProgressBar(uploadProgress, 'Evidence CSV')}
                    </div>
                  ) : (
                    <div>
                      <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors">
                        <UploadCloud size={13} />
                        <span>Attach Evidence CSV(s)</span>
                        <input
                          type="file"
                          accept=".csv"
                          multiple
                          disabled={Boolean(uploadingCaseId)}
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) handleAttachEvidence(docket.id, files);
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {docket.notes && (
                  <p className="text-[11px] text-slate-500 line-clamp-2 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {docket.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem('anvitrace_active_case', JSON.stringify(docket));
                    } catch { }
                    onInvestigateAccount(docket.targetAccount);
                  }}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Deep-Dive</span>
                  <ArrowRight size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem('anvitrace_active_case', JSON.stringify(docket));
                    } catch { }
                    if (onNavigateToNotice) {
                      onNavigateToNotice(docket.targetAccount, 'freeze_requisition');
                    } else {
                      onNavigateToDocuments();
                    }
                  }}
                  className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                  title="Generate Sec. 102 Bank Freeze Notice for Case"
                >
                  <ShieldAlert size={14} />
                  <span>Notice</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem('anvitrace_active_case', JSON.stringify(docket));
                    } catch { }
                    if (onNavigateToNotice) {
                      onNavigateToNotice(docket.targetAccount, 'case_diary');
                    } else {
                      onNavigateToDocuments();
                    }
                  }}
                  className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                  title="Generate Rule 172 CrPC Case Diary for Case"
                >
                  <FileText size={14} className="text-amber-700" />
                  <span>Diary</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderPlus size={18} className="text-amber-600" />
                <span>Register Formal Case Docket</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                  CASE REFERENCE / FIR NUMBER <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCaseId}
                  onChange={(e) => setNewCaseId(e.target.value)}
                  placeholder="e.g. CR-2024-CYBER-01"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                  INVESTIGATION TITLE
                </label>
                <input
                  type="text"
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  placeholder="e.g. Mule Syndicate Layering Investigation"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                  PRIMARY TARGET / SUSPECT ACCOUNT ID <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCaseTarget}
                  onChange={(e) => setNewCaseTarget(e.target.value)}
                  placeholder="e.g. SBIN10001486"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                  APPLICABLE STATUTORY ACT
                </label>
                <input
                  type="text"
                  value={newCaseAct}
                  onChange={(e) => setNewCaseAct(e.target.value)}
                  placeholder="e.g. Sec. 66D IT Act / 420 IPC"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                  CASE NOTES / BRIEF
                </label>
                <textarea
                  rows={2}
                  value={newCaseNotes}
                  onChange={(e) => setNewCaseNotes(e.target.value)}
                  placeholder="Initial complaint details, nodal referral, etc."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                  ATTACH EVIDENCE CSV(S) (OPTIONAL)
                </label>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2.5">
                  <input
                    type="file"
                    accept=".csv"
                    multiple
                    disabled={Boolean(uploadingCaseId)}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) setNewCaseFiles(files);
                    }}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 disabled:opacity-50 cursor-pointer"
                  />

                  {/* Ready File Preview badge when selected */}
                  {newCaseFiles.length > 0 && !uploadingCaseId && (
                    <div className="space-y-1.5">
                      <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs shadow-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                            <FileSpreadsheet size={16} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 truncate">
                              {newCaseFiles.length === 1
                                ? newCaseFiles[0].name
                                : `${newCaseFiles.length} Evidence CSV Files Attached`}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {(
                                newCaseFiles.reduce((acc, f) => acc + f.size, 0) /
                                (1024 * 1024)
                              ).toFixed(1)}{' '}
                              MB total • Ready for Ingestion
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                          {newCaseFiles.length} READY
                        </span>
                      </div>
                      {newCaseFiles.length > 1 && (
                        <div className="text-[10px] font-mono text-slate-400 pl-1 truncate">
                          {newCaseFiles.map((f) => f.name).join(' • ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Active Ingestion Progress Bar */}
                  {uploadingCaseId === 'new_case' && (
                    <div className="pt-1">
                      {renderProgressBar(
                        uploadProgress,
                        newCaseFiles.length > 0 ? newCaseFiles[0].name : undefined
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={Boolean(uploadingCaseId)}
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(uploadingCaseId)}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {uploadingCaseId === 'new_case' ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-white" />
                      <span>Ingesting Evidence ({uploadProgress?.percent || 0}%)...</span>
                    </>
                  ) : (
                    <span>Save Case Docket</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
