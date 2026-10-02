import React, { useState } from 'react';
import { api } from '../api';
import { FolderPlus, FileText, Search, Database, Trash2, UploadCloud, CheckCircle2, ShieldAlert } from 'lucide-react';

interface CaseManagementViewProps {
  onInvestigateAccount: (accountId: string) => void;
  onNavigateToDataset: () => void;
  onNavigateToDocuments: () => void;
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

export const CaseManagementView: React.FC<CaseManagementViewProps> = ({
  onInvestigateAccount,
  onNavigateToDataset,
  onNavigateToDocuments,
}) => {
  const [cases, setCases] = useState<CaseDocket[]>(() => {
    try {
      const saved = localStorage.getItem('anvitrace_cases');
      return saved ? JSON.parse(saved) : [];
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
  const [newCaseFile, setNewCaseFile] = useState<File | null>(null);

  // Evidence upload state
  const [uploadingCaseId, setUploadingCaseId] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const saveCases = (updated: CaseDocket[]) => {
    setCases(updated);
    try {
      localStorage.setItem('anvitrace_cases', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save cases to localStorage', e);
    }
  };

  const handleAttachEvidence = async (caseId: string, file: File) => {
    setUploadingCaseId(caseId);
    setUploadError(null);
    setUploadMessage(null);
    try {
      const resp = await api.uploadDataset(file);
      const updated = cases.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            datasetId: resp.dataset_id,
            datasetFilename: file.name,
            datasetTotalRows: resp.total_rows || 2000000,
            datasetHash: resp.dataset_hash,
          };
        }
        return c;
      });
      saveCases(updated);
      setUploadMessage(`Evidence CSV '${file.name}' attached to Case ${caseId}! Ingested into DuckDB.`);
    } catch (err: any) {
      setUploadError(`Evidence upload failed: ${err.message}`);
    } finally {
      setUploadingCaseId(null);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseId.trim() || !newCaseTarget.trim()) return;

    let attachedDatasetId: string | undefined;
    let attachedFilename: string | undefined;
    let attachedRows: number | undefined;
    let attachedHash: string | undefined;

    if (newCaseFile) {
      setUploadingCaseId(newCaseId.trim().toUpperCase());
      try {
        const resp = await api.uploadDataset(newCaseFile);
        attachedDatasetId = resp.dataset_id;
        attachedFilename = newCaseFile.name;
        attachedRows = resp.total_rows || 2000000;
        attachedHash = resp.dataset_hash;
      } catch (err: any) {
        setUploadError(`Evidence upload failed: ${err.message}`);
      } finally {
        setUploadingCaseId(null);
      }
    }

    const newDocket: CaseDocket = {
      id: newCaseId.trim().toUpperCase(),
      title: newCaseTitle.trim() || `Investigation ${newCaseTarget.trim()}`,
      act: newCaseAct.trim(),
      targetAccount: newCaseTarget.trim(),
      notes: newCaseNotes.trim(),
      createdAt: new Date().toISOString(),
      status: 'Active Investigation',
      datasetId: attachedDatasetId,
      datasetFilename: attachedFilename,
      datasetTotalRows: attachedRows,
      datasetHash: attachedHash,
    };

    saveCases([newDocket, ...cases]);
    setShowCreateModal(false);
    setNewCaseId('');
    setNewCaseTitle('');
    setNewCaseTarget('');
    setNewCaseNotes('');
    setNewCaseFile(null);
  };

  const handleDeleteCase = (id: string) => {
    if (confirm(`Remove case docket ${id}?`)) {
      saveCases(cases.filter((c) => c.id !== id));
    }
  };

  const filteredCases = cases.filter(
    (c) =>
      c.id.toLowerCase().includes(filterText.toLowerCase()) ||
      c.title.toLowerCase().includes(filterText.toLowerCase()) ||
      c.targetAccount.toLowerCase().includes(filterText.toLowerCase()) ||
      c.act.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Header Bar */}
      <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-data-mono font-bold uppercase tracking-wider text-outline">
                INVESTIGATION REGISTRY // AIR-GAPPED FORENSICS
              </span>
            </div>
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface mt-0.5">
              Case Dockets &amp; Formal Enquiries
            </h1>
            <p className="text-[12px] text-on-surface-variant font-data-mono mt-0.5">
              Maintain case references, statutory FIR identifiers, suspect account registries, and court submission dockets.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => onNavigateToDataset()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold border border-outline-variant/40 transition-colors shadow-xs"
            >
              <Database size={15} className="text-secondary" />
              <span>Dataset Setup</span>
            </button>
            <button
              onClick={() => onNavigateToDocuments()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold border border-outline-variant/40 transition-colors shadow-xs"
            >
              <FileText size={15} className="text-blue-600" />
              <span>Statutory Documents</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container hover:bg-black text-on-primary text-xs font-bold transition-colors shadow-sm"
            >
              <FolderPlus size={16} />
              <span>Register New Case</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {cases.length > 0 && (
          <div className="pt-2 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-2.5 text-on-surface-variant" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter cases by ID, account, or statutory act..."
                className="w-full bg-surface-container-low pl-9 pr-3 py-1.5 rounded-lg border border-outline-variant/40 text-xs font-data-mono text-on-surface focus:outline-none"
              />
            </div>
            <span className="text-xs font-data-mono text-outline">
              Showing {filteredCases.length} of {cases.length} dockets
            </span>
          </div>
        )}
      </div>

      {/* Case Dockets Grid or Empty State */}
      {cases.length === 0 ? (
        <div className="bg-surface-container-lowest p-12 rounded-xl border border-outline-variant/30 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-surface-container-low mx-auto flex items-center justify-center text-outline">
            <FolderPlus size={24} />
          </div>
          <h3 className="font-headline-md text-base font-bold text-on-surface">No Case Dockets Registered</h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto font-data-mono">
            Click &quot;Register New Case&quot; to initialize a formal investigation reference, or search any Account ID in the Investigation Workspace.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary-container hover:bg-black text-on-primary text-xs font-bold rounded-lg shadow-sm"
            >
              Register First Case Docket
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map((docket) => (
            <div
              key={docket.id}
              className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between space-y-3 hover:border-outline-variant transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-surface-container font-data-mono text-xs font-bold text-indigo-700">
                    {docket.id}
                  </span>
                  <button
                    onClick={() => handleDeleteCase(docket.id)}
                    className="text-on-surface-variant hover:text-rose-600 transition-colors"
                    title="Remove Docket"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <h3 className="font-headline-md text-sm font-bold text-on-surface line-clamp-1">
                  {docket.title}
                </h3>
                <div className="space-y-1 font-data-mono text-xs text-on-surface-variant">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-outline uppercase font-semibold">TARGET ACCOUNT:</span>
                    <strong className="text-on-surface">{docket.targetAccount}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-outline uppercase font-semibold">STATUTORY ACT:</span>
                    <span className="truncate max-w-[180px]">{docket.act}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-outline uppercase font-semibold">REGISTERED:</span>
                    <span>{docket.createdDate}</span>
                  </div>
                </div>

                {/* Evidence CSV info or upload trigger */}
                <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-outline uppercase font-bold flex items-center gap-1">
                      <Database size={11} className="text-secondary" />
                      EVIDENCE DATASET
                    </span>
                    {docket.datasetId ? (
                      <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                        INGESTED IN DUCKDB
                      </span>
                    ) : (
                      <span className="text-[9px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        NO CSV ATTACHED
                      </span>
                    )}
                  </div>
                  {docket.datasetFilename ? (
                    <div className="text-[10px] font-data-mono text-on-surface">
                      <span className="font-semibold text-indigo-700 block truncate">{docket.datasetFilename}</span>
                      <span className="text-on-surface-variant block mt-0.5">
                        {docket.datasetTotalRows ? `${docket.datasetTotalRows.toLocaleString()} records` : 'Dataset active'} • ID: {docket.datasetId?.slice(0, 12)}...
                      </span>
                    </div>
                  ) : (
                    <div>
                      <label className="cursor-pointer inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors">
                        <UploadCloud size={12} />
                        <span>{uploadingCaseId === docket.id ? 'Ingesting CSV...' : 'Attach & Ingest Evidence CSV'}</span>
                        <input
                          type="file"
                          accept=".csv"
                          disabled={uploadingCaseId === docket.id}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAttachEvidence(docket.id, file);
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {docket.notes && (
                  <p className="text-[11px] text-on-surface-variant line-clamp-2 italic bg-surface-container-low p-2 rounded">
                    {docket.notes}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    try {
                      localStorage.setItem('anvitrace_active_case', JSON.stringify(docket));
                    } catch {}
                    onInvestigateAccount(docket.targetAccount);
                  }}
                  className="flex-1 py-1.5 bg-primary-container hover:bg-black text-on-primary rounded text-xs font-bold transition-colors shadow-xs text-center"
                >
                  Deep-Dive →
                </button>
                <button
                  onClick={() => {
                    try {
                      localStorage.setItem('anvitrace_active_case', JSON.stringify(docket));
                    } catch {}
                    onNavigateToDocuments();
                  }}
                  className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                  title="Generate Sec. 102 Bank Freeze Notice for Case"
                >
                  <ShieldAlert size={14} />
                  <span>Notice</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-xl border border-outline-variant/30 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <h2 className="font-headline-md text-lg font-bold text-on-surface flex items-center gap-2">
                <FolderPlus size={18} className="text-secondary" />
                Register Formal Case Docket
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-on-surface-variant hover:text-on-surface text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-3 font-data-mono text-xs">
              <div>
                <label className="text-[10px] text-outline uppercase font-bold block mb-1">
                  CASE REFERENCE / FIR NUMBER *
                </label>
                <input
                  type="text"
                  required
                  value={newCaseId}
                  onChange={(e) => setNewCaseId(e.target.value)}
                  placeholder="e.g. CR-2024-CYBER-01"
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2.5 text-on-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-outline uppercase font-bold block mb-1">
                  INVESTIGATION TITLE
                </label>
                <input
                  type="text"
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  placeholder="e.g. Mule Syndicate Investigation"
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2.5 text-on-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-outline uppercase font-bold block mb-1">
                  PRIMARY TARGET / VICTIM ACCOUNT ID *
                </label>
                <input
                  type="text"
                  required
                  value={newCaseTarget}
                  onChange={(e) => setNewCaseTarget(e.target.value)}
                  placeholder="e.g. ACC_VIC_001"
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2.5 text-on-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-outline uppercase font-bold block mb-1">
                  APPLICABLE STATUTORY ACT
                </label>
                <input
                  type="text"
                  value={newCaseAct}
                  onChange={(e) => setNewCaseAct(e.target.value)}
                  placeholder="e.g. Sec. 66D IT Act / 420 IPC"
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2.5 text-on-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-outline uppercase font-bold block mb-1">
                  CASE NOTES / BRIEF
                </label>
                <textarea
                  rows={2}
                  value={newCaseNotes}
                  onChange={(e) => setNewCaseNotes(e.target.value)}
                  placeholder="Initial complaint details, referral source, etc."
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2.5 text-on-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-outline uppercase font-bold block mb-1">
                  ATTACH EVIDENCE CSV (OPTIONAL)
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setNewCaseFile(f);
                  }}
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg p-2 text-on-surface focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-container file:text-on-primary hover:file:bg-black"
                />
                {newCaseFile && (
                  <span className="text-[10px] text-emerald-700 block mt-1 font-bold">
                    ✓ Selected: {newCaseFile.name} (will be ingested into DuckDB and saved to this case)
                  </span>
                )}
              </div>

              <div className="pt-3 border-t border-outline-variant/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(uploadingCaseId)}
                  className="px-5 py-2 rounded-lg bg-primary-container hover:bg-black text-on-primary font-bold shadow-sm disabled:opacity-50"
                >
                  {uploadingCaseId ? 'Ingesting Evidence...' : 'Save Case Docket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
