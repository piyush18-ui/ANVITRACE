import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import type {
  EvidenceDetail,
  EvidenceVerifyResult,
  VerificationHistoryItem,
  AuditChainStatus,
} from '../api';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Upload,
  FileCheck2,
  HardDrive,
  Clock,
  FileSpreadsheet,
  X,
  FileWarning,
} from 'lucide-react';

interface EvidenceIntegrityPanelProps {
  datasetId?: string;
  initialEvidenceId?: string;
  warningBanner?: {
    existing_evidence_id: string;
    message: string;
    existing_sha256?: string;
    new_sha256?: string;
  } | null;
  onClose?: () => void;
  isModal?: boolean;
}

export const EvidenceIntegrityPanel: React.FC<EvidenceIntegrityPanelProps> = ({
  datasetId,
  initialEvidenceId,
  warningBanner,
  onClose,
  isModal = false,
}) => {
  const [evidenceList, setEvidenceList] = useState<EvidenceDetail[]>([]);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(initialEvidenceId || null);
  const [evidenceDetail, setEvidenceDetail] = useState<EvidenceDetail | null>(null);
  const [loadingEvidence, setLoadingEvidence] = useState<boolean>(true);

  // Verification state
  const [verifyingUpload, setVerifyingUpload] = useState<boolean>(false);
  const [verifyingStored, setVerifyingStored] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<EvidenceVerifyResult | null>(null);
  const [history, setHistory] = useState<VerificationHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Audit chain state
  const [auditChain, setAuditChain] = useState<AuditChainStatus | null>(null);
  const [refreshingAudit, setRefreshingAudit] = useState<boolean>(false);

  // UI state
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Fetch evidence list on mount or datasetId change
  const fetchEvidenceList = async () => {
    setLoadingEvidence(true);
    setErrorMessage(null);
    try {
      const items = await api.listEvidenceFiles(datasetId);
      setEvidenceList(items);

      if (items.length > 0) {
        if (selectedEvidenceId && items.some((i) => i.evidence_id === selectedEvidenceId)) {
          // Keep current selection
        } else {
          setSelectedEvidenceId(items[0].evidence_id);
        }
      } else {
        setSelectedEvidenceId(null);
        setEvidenceDetail(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to retrieve evidence registry');
    } finally {
      setLoadingEvidence(false);
    }
  };

  useEffect(() => {
    fetchEvidenceList();
  }, [datasetId]);

  // 2. Fetch evidence detail and history when selectedEvidenceId changes
  useEffect(() => {
    if (!selectedEvidenceId) return;

    const loadDetailAndHistory = async () => {
      try {
        const detail = await api.getEvidenceDetails(selectedEvidenceId);
        setEvidenceDetail(detail);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load evidence details');
      }

      setLoadingHistory(true);
      try {
        const hist = await api.getEvidenceHistory(selectedEvidenceId);
        setHistory(hist);
      } catch (err: any) {
        console.warn('Failed to load history', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadDetailAndHistory();
  }, [selectedEvidenceId]);

  // 3. Fetch audit chain status on mount
  const checkAuditChain = async () => {
    setRefreshingAudit(true);
    try {
      const res = await api.verifyAuditChain();
      setAuditChain(res);
    } catch (err: any) {
      console.warn('Audit chain check error', err);
    } finally {
      setRefreshingAudit(false);
    }
  };

  useEffect(() => {
    checkAuditChain();
  }, []);

  // Handlers
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleVerifyStored = async () => {
    if (!selectedEvidenceId) return;
    setVerifyingStored(true);
    setErrorMessage(null);
    try {
      const res = await api.verifyStoredEvidence(selectedEvidenceId);
      setVerificationResult(res);
      // Refresh history & audit chain
      const hist = await api.getEvidenceHistory(selectedEvidenceId);
      setHistory(hist);
      await checkAuditChain();
      // Update evidence detail last status
      if (evidenceDetail) {
        setEvidenceDetail({ ...evidenceDetail, last_verification_status: res.status });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification of stored evidence failed');
    } finally {
      setVerifyingStored(false);
    }
  };

  const handleCandidateFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEvidenceId) return;

    setVerifyingUpload(true);
    setErrorMessage(null);
    try {
      const res = await api.verifyEvidenceUpload(selectedEvidenceId, file);
      setVerificationResult(res);
      // Refresh history & audit chain
      const hist = await api.getEvidenceHistory(selectedEvidenceId);
      setHistory(hist);
      await checkAuditChain();
      if (evidenceDetail) {
        setEvidenceDetail({ ...evidenceDetail, last_verification_status: res.status });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verify-by-upload failed');
    } finally {
      setVerifyingUpload(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Character-by-character hash diff rendering
  const renderDiffHash = (baseHash: string, candidateHash?: string) => {
    if (!candidateHash) {
      return <span className="font-mono text-slate-800 break-all">{baseHash}</span>;
    }

    const chars = [];
    const maxLen = Math.max(baseHash.length, candidateHash.length);
    for (let i = 0; i < maxLen; i++) {
      const c = candidateHash[i] || '';
      const b = baseHash[i] || '';
      const isDiff = c !== b;
      chars.push(
        <span
          key={i}
          className={
            isDiff
              ? 'bg-rose-200 text-rose-950 font-bold px-0.5 rounded ring-1 ring-rose-400'
              : 'text-slate-800'
          }
          title={isDiff ? `Position ${i + 1}: expected '${b}', got '${c}'` : undefined}
        >
          {c || '•'}
        </span>
      );
    }
    return <span className="font-mono break-all leading-relaxed">{chars}</span>;
  };

  const content = (
    <div className="space-y-6">
      {/* Header bar with Audit Chain Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
              EVIDENCE INTEGRITY LAYER // JUDGE-DEMO FLOW
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
            <ShieldCheck className="text-emerald-700" size={22} />
            Cryptographic Evidence Verification
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Deterministic SHA-256 verification, streaming candidate comparison, and HMAC-SHA256 audit chain.
          </p>
        </div>

        {/* Audit Chain Badge with Refresh */}
        <div className="flex items-center gap-2">
          {auditChain ? (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                auditChain.ok
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border-rose-300'
              }`}
            >
              {auditChain.ok ? (
                <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-rose-700 shrink-0" />
              )}
              <span>
                {auditChain.ok
                  ? `Audit chain: Intact (Seq #${auditChain.total_events || 0})`
                  : `Audit chain: Broken at #${auditChain.broken_at_seq}`}
              </span>
              <button
                type="button"
                onClick={checkAuditChain}
                disabled={refreshingAudit}
                className="ml-1 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                title="Re-verify HMAC Audit Chain"
              >
                <RefreshCw size={13} className={refreshingAudit ? 'animate-spin' : ''} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
              <RefreshCw size={13} className="animate-spin" />
              <span>Checking audit chain...</span>
            </div>
          )}

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Warning Banner: Same filename, different content */}
      {warningBanner && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 space-y-2">
          <div className="flex items-start gap-2.5">
            <FileWarning size={18} className="text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold block text-sm">
                Same filename, different content. Compare with the registered original?
              </span>
              <p className="text-amber-800">
                A newly ingested dataset has the same filename but distinct cryptographic content. You can compare it directly with the original registered evidence below.
              </p>
            </div>
          </div>
          {warningBanner.existing_evidence_id && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEvidenceId(warningBanner.existing_evidence_id)}
                className="px-3 py-1.5 bg-amber-700 text-white rounded-lg text-xs font-semibold hover:bg-amber-800 transition-colors cursor-pointer"
              >
                Inspect Registered Original Evidence →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-mono text-rose-800 flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Evidence Selection dropdown (if multiple) */}
      {evidenceList.length > 1 && (
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-xs font-mono font-bold text-slate-500 uppercase shrink-0">
            REGISTERED EVIDENCE:
          </span>
          <select
            value={selectedEvidenceId || ''}
            onChange={(e) => setSelectedEvidenceId(e.target.value)}
            className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none"
          >
            {evidenceList.map((ev) => (
              <option key={ev.evidence_id} value={ev.evidence_id}>
                {ev.filename} ({formatBytes(ev.size_bytes)}) — {ev.evidence_id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Loading state for evidence details */}
      {loadingEvidence ? (
        <div className="p-8 text-center text-xs text-slate-500 space-y-2">
          <RefreshCw size={20} className="animate-spin mx-auto text-slate-400" />
          <span>Loading evidence registry...</span>
        </div>
      ) : !evidenceDetail ? (
        <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
          <FileSpreadsheet size={28} className="mx-auto text-slate-400" />
          <h4 className="text-sm font-bold text-slate-800">No Evidence Registered Yet</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Upload a transaction dataset to register its physical evidence file, record its SHA-256 digest, and start the verification flow.
          </p>
        </div>
      ) : (
        <>
          {/* Evidence Details Card */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="text-indigo-600" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-mono">
                    {evidenceDetail.filename}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Evidence ID: {evidenceDetail.evidence_id} • Dataset: {evidenceDetail.dataset_id}
                  </span>
                </div>
              </div>

              {/* Last Verification Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">STATUS:</span>
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border flex items-center gap-1 ${
                    evidenceDetail.last_verification_status === 'VERIFIED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : evidenceDetail.last_verification_status === 'MISMATCH'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {evidenceDetail.last_verification_status === 'VERIFIED' ? (
                    <CheckCircle2 size={13} className="text-emerald-600" />
                  ) : evidenceDetail.last_verification_status === 'MISMATCH' ? (
                    <AlertTriangle size={13} className="text-rose-600" />
                  ) : (
                    <Clock size={13} className="text-slate-500" />
                  )}
                  {evidenceDetail.last_verification_status}
                </span>
              </div>
            </div>

            {/* Evidence Specs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  FILE SIZE
                </span>
                <strong className="text-slate-900 font-mono block mt-0.5">
                  {formatBytes(evidenceDetail.size_bytes)} ({evidenceDetail.size_bytes.toLocaleString('en-IN')} bytes)
                </strong>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  RECORDED AT
                </span>
                <strong className="text-slate-900 font-mono block mt-0.5">
                  {evidenceDetail.recorded_at}
                </strong>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  HASH ALGORITHM
                </span>
                <strong className="text-slate-900 font-mono block mt-0.5">
                  {evidenceDetail.algorithm} (FIPS 180-4)
                </strong>
              </div>

              {/* SHA-256 Digest box with copy */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    RECORDED SHA-256 DIGEST (BASELINE)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(evidenceDetail.sha256)}
                    className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-[10px] font-mono transition-colors cursor-pointer"
                  >
                    {copiedHash === evidenceDetail.sha256 ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} />
                    )}
                    <span>{copiedHash === evidenceDetail.sha256 ? 'COPIED' : 'COPY SHA-256'}</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-indigo-900 font-semibold break-all mt-1 bg-white p-2.5 rounded-lg border border-slate-200 select-all">
                  {evidenceDetail.sha256}
                </div>
              </div>
            </div>

            {/* Action Buttons: Verify Stored & Verify Upload */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {/* Native Hidden File Input for candidate upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleCandidateFileSelected}
                className="hidden"
                id="judge-verify-upload-input"
              />

              {/* Verify by Upload Button (Primary Demo Flow) */}
              <button
                type="button"
                disabled={verifyingUpload || verifyingStored}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Upload size={14} className={verifyingUpload ? 'animate-spin' : ''} />
                <span>{verifyingUpload ? 'Streaming & Hashing Candidate...' : 'Verify File (Pick Candidate / Edited Copy)'}</span>
              </button>

              {/* Verify Stored File Button (Control Check) */}
              <button
                type="button"
                disabled={verifyingUpload || verifyingStored}
                onClick={handleVerifyStored}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <HardDrive size={14} className={verifyingStored ? 'animate-spin' : ''} />
                <span>{verifyingStored ? 'Verifying Stored...' : 'Verify Stored Baseline File'}</span>
              </button>
            </div>
          </div>

          {/* Verification Result Panel (Appears after verifying) */}
          {verificationResult && (
            <div
              className={`p-5 rounded-xl border shadow-xs space-y-4 transition-all ${
                verificationResult.status === 'VERIFIED'
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-rose-50/70 border-rose-300'
              }`}
            >
              {/* Large Status Display with Text AND Distinct Icon */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-black/10">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                      verificationResult.status === 'VERIFIED'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {verificationResult.status === 'VERIFIED' ? (
                      <CheckCircle2 size={28} />
                    ) : (
                      <AlertTriangle size={28} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold font-mono tracking-tight text-slate-900">
                        STATUS: {verificationResult.status}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          verificationResult.status === 'VERIFIED'
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-rose-200 text-rose-900'
                        }`}
                      >
                        {verificationResult.status === 'VERIFIED'
                          ? 'Digest Match'
                          : 'Mismatch Detected'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1 font-mono">
                      {verificationResult.note}
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] font-mono text-slate-500 shrink-0">
                  <span>Checked: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Side-by-Side Hashes Comparison with Differing Characters Highlighted */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                  {/* Recorded Digest */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase font-mono">
                      <span>RECORDED SHA-256 DIGEST</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(verificationResult.recorded_sha256 || '')}
                        className="text-slate-400 hover:text-slate-700 flex items-center gap-1"
                      >
                        <Copy size={11} />
                        <span>COPY</span>
                      </button>
                    </div>
                    <div className="text-[11px] font-mono break-all font-semibold text-slate-800 bg-slate-50 p-2 rounded border border-slate-100">
                      {verificationResult.recorded_sha256 || 'None'}
                    </div>
                  </div>

                  {/* Recomputed / Candidate Digest (With Character Highlights) */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase font-mono">
                      <span>CANDIDATE RECOMPUTED SHA-256</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(verificationResult.recomputed_sha256 || '')}
                        className="text-slate-400 hover:text-slate-700 flex items-center gap-1"
                      >
                        <Copy size={11} />
                        <span>COPY</span>
                      </button>
                    </div>
                    <div className="text-[11px] font-mono break-all font-semibold bg-slate-50 p-2 rounded border border-slate-100">
                      {renderDiffHash(
                        verificationResult.recorded_sha256 || '',
                        verificationResult.recomputed_sha256 || ''
                      )}
                    </div>
                  </div>
                </div>

                {/* Side-by-Side Size Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between font-mono">
                    <span className="text-slate-500 text-[11px]">Recorded Size:</span>
                    <strong className="text-slate-900">
                      {formatBytes(verificationResult.recorded_size ?? 0)} ({(verificationResult.recorded_size ?? 0).toLocaleString('en-IN')} B)
                    </strong>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between font-mono">
                    <span className="text-slate-500 text-[11px]">
                      {verificationResult.candidate_size !== undefined ? 'Candidate Size:' : 'Current File Size:'}
                    </span>
                    <strong
                      className={
                        (verificationResult.candidate_size ?? verificationResult.current_size) === verificationResult.recorded_size
                          ? 'text-emerald-800'
                          : 'text-rose-800'
                      }
                    >
                      {formatBytes(verificationResult.candidate_size ?? verificationResult.current_size ?? 0)}{' '}
                      ({(verificationResult.candidate_size ?? verificationResult.current_size ?? 0).toLocaleString('en-IN')} B)
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Verification History Log */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-mono font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <Clock size={14} className="text-indigo-600" />
                VERIFICATION HISTORY ({history.length} CHECKS RECORDED)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                APPEND-ONLY AUDIT TRAIL
              </span>
            </div>

            {loadingHistory ? (
              <div className="p-4 text-center text-xs text-slate-500">
                <RefreshCw size={14} className="animate-spin inline mr-1" />
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 font-mono">
                No verification events recorded yet. Run a verification check above.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2.5">TIMESTAMP</th>
                      <th className="p-2.5">EVENT ID</th>
                      <th className="p-2.5">STATUS</th>
                      <th className="p-2.5">RECOMPUTED SHA-256</th>
                      <th className="p-2.5">AUDIT NOTE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((ev) => (
                      <tr key={ev.event_id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 text-slate-700 whitespace-nowrap">{ev.checked_at}</td>
                        <td className="p-2.5 text-slate-500 whitespace-nowrap">{ev.event_id}</td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ev.status === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ev.status === 'MISMATCH'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {ev.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-800 break-all max-w-[200px] truncate" title={ev.recomputed_sha256}>
                          {ev.recomputed_sha256 ? `${ev.recomputed_sha256.slice(0, 16)}...` : 'N/A'}
                        </td>
                        <td className="p-2.5 text-slate-600 max-w-[240px] truncate" title={ev.note}>
                          {ev.note}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Statutory & Forensic Help Text (Required wording) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <FileCheck2 size={15} className="text-indigo-600" />
              <span>Statutory Technical Disclaimer</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              SHA-256 shows whether the compared bytes match the recorded digest. It does not prove authenticity, provenance, or legal admissibility.
            </p>
          </div>
        </>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
