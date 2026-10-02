import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { DatasetStatus, DatasetStats } from '../api';
import { Database, UploadCloud, CheckCircle2, AlertCircle, RefreshCw, FileSpreadsheet, Loader2, ArrowLeft } from 'lucide-react';

interface DatasetViewProps {
  onGoBack?: () => void;
  previousLabel?: string;
}

export const DatasetView: React.FC<DatasetViewProps> = ({
  onGoBack,
  previousLabel,
}) => {
  const [status, setStatus] = useState<DatasetStatus | null>(null);
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; stage: string; loaded?: number; total?: number } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [st, stts] = await Promise.all([
        api.getDatasetStatus().catch(() => null),
        api.getDatasetStats().catch(() => null),
      ]);
      if (st) setStatus(st);
      if (stts) setStats(stts);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setUploadMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadMessage(null);
    setError(null);
    setUploadProgress({
      percent: 5,
      stage: 'Preparing evidence CSV payload...',
      loaded: 0,
      total: selectedFile.size,
    });

    try {
      const resp = await api.uploadDataset(selectedFile, (p) => {
        setUploadProgress(p);
      });
      setUploadMessage(`Dataset ingested successfully: ${resp.message} (Dataset ID: ${resp.dataset_id})`);
      setSelectedFile(null);
      await fetchData();
    } catch (err: any) {
      setError(`Ingestion failed: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const isIndexed = status?.status === 'indexed';

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Header */}
      <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {onGoBack && (
              <button
                type="button"
                onClick={onGoBack}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container hover:bg-surface-container-high text-on-surface rounded text-xs font-semibold border border-outline-variant/30 transition-all shadow-xs cursor-pointer group mr-1"
                title={previousLabel ? `Back to ${previousLabel}` : 'Go back to previous screen'}
              >
                <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5 text-on-surface-variant" />
                <span>Back{previousLabel ? `: ${previousLabel}` : ''}</span>
              </button>
            )}
            <span className="text-[11px] font-data-mono font-bold uppercase tracking-wider text-outline">
              INGESTION &amp; FORENSIC PROVENANCE
            </span>
          </div>
          <h1 className="font-headline-lg text-2xl font-bold text-on-surface mt-0.5">
            Dataset Ingestion &amp; Health
          </h1>
          <p className="text-[12px] text-on-surface-variant font-data-mono mt-0.5">
            Streaming CSV ledger ingestion, normalization, validation, and SHA-256 provenance sealing.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded text-[12px] font-semibold text-on-surface border border-outline-variant/30 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Status
        </button>
      </div>

      {uploadMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] rounded-lg font-data-mono flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{uploadMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-[12px] rounded-lg flex items-center gap-2 font-data-mono">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Operations Grid: Upload Target + Active Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload Zone (7 cols) */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-base font-bold text-on-surface flex items-center gap-2">
              <UploadCloud size={18} className="text-secondary" />
              Upload Transaction Ledger
            </h2>
            <span className="font-data-mono-sm text-[10px] text-outline uppercase">
              CSV FORMAT • AIR-GAPPED
            </span>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Select a raw CSV banking transaction export. The system validates timestamps, accounts, IFSC codes, amounts, and writes to an indexed store.
          </p>

          {/* File Selector Dropzone */}
          <div className="p-6 bg-surface-container-low rounded-lg border-2 border-dashed border-outline-variant/40 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container transition-colors relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-12 h-12 rounded-full bg-surface-container-lowest shadow-xs flex items-center justify-center mb-2">
              <FileSpreadsheet size={22} className="text-secondary" />
            </div>
            <span className="font-headline-md text-sm font-bold text-on-surface">
              {selectedFile ? selectedFile.name : 'Select or Drop CSV File Here'}
            </span>
            <span className="text-[11px] text-on-surface-variant mt-0.5 font-data-mono">
              {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : 'Maximum payload streamed chunk-by-chunk'}
            </span>
          </div>

          {/* Active Upload Progress Bar */}
          {uploading && (
            <div className="p-3.5 bg-slate-900 text-white rounded-xl shadow-sm space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin text-white" />
                  <span>Ingesting Evidence Dataset</span>
                </span>
                <span className="font-mono font-bold text-white">{uploadProgress?.percent || 5}%</span>
              </div>

              {/* Progress track */}
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 ring-1 ring-slate-700/60">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                  style={{ width: `${Math.max(4, Math.min(100, uploadProgress?.percent || 5))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate max-w-[280px] font-medium text-slate-300">
                  {uploadProgress?.stage || 'Processing transactions...'}
                </span>
                {uploadProgress?.total && (
                  <span className="font-mono shrink-0 ml-2 text-slate-300">
                    {(uploadProgress.loaded || 0) >= (uploadProgress.total || 0)
                      ? (uploadProgress.percent || 0) >= 100
                        ? `${((uploadProgress.total || 0) / (1024 * 1024)).toFixed(1)} MB • Complete`
                        : `${((uploadProgress.total || 0) / (1024 * 1024)).toFixed(1)} MB • Ingesting`
                      : `${((uploadProgress.loaded || 0) / (1024 * 1024)).toFixed(1)} / ${((uploadProgress.total || 0) / (1024 * 1024)).toFixed(1)} MB`}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] font-data-mono text-outline">
              Automatic SHA-256 pre-calculation upon upload
            </span>
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin text-amber-400" />
                  Ingesting ({uploadProgress?.percent || 0}%)...
                </>
              ) : (
                <>
                  <UploadCloud size={14} />
                  Ingest Dataset
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real Status Telemetry (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
            <span className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-2">
              <Database size={16} className="text-secondary" />
              Active Dataset Telemetry
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-data-mono font-bold ${
              isIndexed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
            }`}>
              {status?.status ? status.status.toUpperCase() : 'NO ACTIVE DATASET'}
            </span>
          </div>

          {status ? (
            <div className="space-y-2.5 text-xs font-data-mono">
              <div>
                <span className="text-[10px] text-outline uppercase block">DATASET ID</span>
                <span className="font-bold text-on-surface truncate block">{status.dataset_id}</span>
              </div>

              <div>
                <span className="text-[10px] text-outline uppercase block">FILE SHA-256 HASH</span>
                <span className="p-1.5 bg-surface-container-low rounded border border-outline-variant/20 block truncate text-[11px] text-on-surface">
                  {status.dataset_hash}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 bg-surface-container-low rounded border border-outline-variant/20">
                  <span className="text-[10px] text-outline uppercase block">TOTAL ROWS</span>
                  <span className="text-base font-bold text-on-surface">{status.total_rows.toLocaleString()}</span>
                </div>
                <div className="p-2 bg-surface-container-low rounded border border-outline-variant/20">
                  <span className="text-[10px] text-outline uppercase block">VALID ROWS</span>
                  <span className="text-base font-bold text-emerald-700">{status.valid_rows.toLocaleString()}</span>
                </div>
              </div>

              {stats && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-surface-container-low rounded border border-outline-variant/20">
                    <span className="text-[10px] text-outline uppercase block">UNIQUE ACCOUNTS</span>
                    <span className="text-base font-bold text-indigo-700">{stats.total_accounts.toLocaleString()}</span>
                  </div>
                  <div className="p-2 bg-surface-container-low rounded border border-outline-variant/20">
                    <span className="text-[10px] text-outline uppercase block">TOTAL VOLUME</span>
                    <span className="text-base font-bold text-on-surface truncate">
                      ₹{stats.total_volume_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="p-8 text-center text-xs text-on-surface-variant">
              No dataset currently loaded. Upload a transaction CSV to begin.
            </div>
          )}
        </div>
      </div>

      {/* Real Ingestion Lifecycle Stages */}
      <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm">
        <h3 className="font-headline-md text-sm font-bold text-on-surface mb-3">
          Processing Pipeline Boundaries
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5 text-xs">
          {[
            { step: '1. Upload', desc: 'CSV payload transfer' },
            { step: '2. Parsing', desc: 'Polars columnar reader' },
            { step: '3. Normalize', desc: 'UTC & uppercase clean' },
            { step: '4. Validate', desc: 'Check rules & IFSC' },
            { step: '5. Indexing', desc: 'Graph indexes' },
            { step: '6. Detection', desc: 'L1/L2/L3 heuristics' },
            { step: '7. Ready', desc: 'Sealed & queryable' },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border text-center flex flex-col justify-between ${
                isIndexed
                  ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900'
                  : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant'
              }`}
            >
              <div className="font-data-mono font-bold text-xs">{item.step}</div>
              <div className="text-[10px] mt-1 text-on-surface-variant">{item.desc}</div>
              <div className="mt-2 text-[10px] font-data-mono font-semibold">
                {isIndexed ? '✓ Complete' : 'Awaiting'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
