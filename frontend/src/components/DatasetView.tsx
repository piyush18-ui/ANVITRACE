import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { DatasetStatus, DatasetStats } from '../api';
import { Database, UploadCloud, CheckCircle2, AlertCircle, RefreshCw, FileSpreadsheet } from 'lucide-react';

export const DatasetView: React.FC = () => {
  const [status, setStatus] = useState<DatasetStatus | null>(null);
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage(null);
    setError(null);
    try {
      const resp = await api.uploadDataset(file);
      setUploadMessage(`Dataset uploaded successfully. Dataset ID: ${resp.dataset_id}. Rows: ${resp.message}`);
      fetchData();
    } catch (err: any) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-data-mono font-bold uppercase tracking-wider text-outline">
            INGESTION, INDEXING &amp; FORENSIC PROVENANCE
          </span>
          <h1 className="font-headline-lg text-2xl font-bold text-on-surface mt-0.5">
            Dataset Ingestion &amp; Health
          </h1>
          <p className="text-[12px] text-on-surface-variant font-data-mono mt-0.5">
            Streaming CSV ingestion, surrogate record_id assignment, IFSC validation, and DuckDB indexing.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded text-[12px] font-semibold text-on-surface border border-outline-variant/30"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
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

      <div className="grid grid-cols-3 gap-5">
        {/* Upload Card */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-3">
          <h2 className="font-headline-md text-base font-bold text-on-surface flex items-center gap-2">
            <UploadCloud size={18} className="text-indigo-600" />
            Upload Financial Dataset
          </h2>
          <p className="text-[12px] text-on-surface-variant">
            Upload CSV transaction ledger. The backend streams chunks into DuckDB and precomputes account features.
          </p>

          <label className="border-2 border-dashed border-outline-variant/60 hover:border-indigo-600 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-surface-container-low/50">
            <FileSpreadsheet size={32} className="text-outline mb-2" />
            <span className="text-[12px] font-bold text-on-surface">Click to select CSV</span>
            <span className="text-[10px] text-outline mt-0.5">.csv financial records format</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>

          {uploading && (
            <div className="text-center text-[12px] font-data-mono text-indigo-700 font-semibold animate-pulse">
              Streaming &amp; indexing in DuckDB...
            </div>
          )}
        </div>

        {/* Ingestion Status Card */}
        <div className="col-span-2 bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm space-y-3">
          <h2 className="font-headline-md text-base font-bold text-on-surface flex items-center gap-2">
            <Database size={18} className="text-emerald-600" />
            Active Dataset Provenance
          </h2>

          {status ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-[11px] font-data-mono">
                <div className="p-2.5 bg-surface-container-low rounded">
                  <span className="text-outline uppercase text-[10px] block">DATASET ID</span>
                  <span className="font-bold text-on-surface truncate block mt-0.5">{status.dataset_id}</span>
                </div>
                <div className="p-2.5 bg-surface-container-low rounded">
                  <span className="text-outline uppercase text-[10px] block">TOTAL ROWS</span>
                  <span className="font-bold text-on-surface block mt-0.5">{status.total_rows.toLocaleString()}</span>
                </div>
                <div className="p-2.5 bg-surface-container-low rounded">
                  <span className="text-outline uppercase text-[10px] block">VALID ROWS</span>
                  <span className="font-bold text-emerald-700 block mt-0.5">{status.valid_rows.toLocaleString()}</span>
                </div>
                <div className="p-2.5 bg-surface-container-low rounded">
                  <span className="text-outline uppercase text-[10px] block">TOTAL VOLUME</span>
                  <span className="font-bold text-emerald-700 block mt-0.5">
                    ₹{stats ? stats.total_volume_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'N/A'}
                  </span>
                </div>
                <div className="p-2.5 bg-surface-container-low rounded">
                  <span className="text-outline uppercase text-[10px] block">REPEATED TX IDS</span>
                  <span className="font-bold text-amber-700 block mt-0.5">{status.repeated_tx_ids.toLocaleString()}</span>
                </div>
                <div className="p-2.5 bg-surface-container-low rounded">
                  <span className="text-outline uppercase text-[10px] block">EXACT DUPLICATES</span>
                  <span className="font-bold text-amber-700 block mt-0.5">{status.exact_duplicates.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-3 bg-surface-container-low rounded text-[11px] font-data-mono">
                <span className="text-outline uppercase text-[10px] block mb-0.5">SOURCE FILE SHA-256 HASH</span>
                <span className="text-on-surface font-bold break-all">{status.dataset_hash}</span>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-on-surface-variant text-[12px]">
              No dataset loaded in DuckDB yet. Upload a CSV above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
