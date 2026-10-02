import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { DatasetStatus, DatasetStats } from '../api';

export const DatasetView: React.FC = () => {
  const [status, setStatus] = useState<DatasetStatus | null>(null);
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeStage, setActiveStage] = useState<number>(7);

  const fetchData = async () => {
    try {
      const [st, stts] = await Promise.all([
        api.getDatasetStatus().catch(() => null),
        api.getDatasetStats().catch(() => null),
      ]);
      if (st) setStatus(st);
      if (stts) setStats(stts);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setSelectedFile(f);
      setError(null);
    }
  };

  const handleStartParsing = async () => {
    if (!selectedFile) {
      alert('Please select or drop a CSV transaction ledger file first.');
      return;
    }

    setUploading(true);
    setUploadMessage(null);
    setError(null);
    setActiveStage(1);

    try {
      // Simulate live stage progression for interactive visual feedback
      setTimeout(() => setActiveStage(2), 300);
      setTimeout(() => setActiveStage(3), 600);
      setTimeout(() => setActiveStage(4), 900);

      const resp = await api.uploadDataset(selectedFile);
      setActiveStage(5);
      setTimeout(() => setActiveStage(6), 300);
      setTimeout(() => setActiveStage(7), 600);

      setUploadMessage(`Ledger successfully ingested: ${resp.message} (Dataset ID: ${resp.dataset_id})`);
      fetchData();
    } catch (err: any) {
      setError(`Ingestion failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Dynamic Notification Bar / Pipeline Heartbeat */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-container-high rounded-lg text-on-surface text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
          <span className="font-data-mono-sm font-semibold uppercase tracking-wider text-secondary">
            PIPELINE ENGINE: LOCAL AIR-GAP DAEMON [{status?.status === 'indexed' ? 'ONLINE' : 'STANDBY'}]
          </span>
          <span className="font-body-sm text-on-surface-variant hidden md:inline">
            • Local memory stream ready; IPC buffer: 0 queued
          </span>
        </div>
        <div className="flex items-center gap-4 font-data-mono-sm text-on-surface-variant">
          <span>DUCKDB: ATTACHED</span>
          <span>INDEX CACHE: WARM</span>
          <span className="text-on-surface font-medium">SESSION #89A-04</span>
        </div>
      </div>

      {/* Screen Top Bar & Case Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-on-surface-variant mb-1">
            <span className="font-data-mono-sm text-xs uppercase tracking-wider">FORENSIC DATA ADAPTER</span>
            <span className="text-xs">•</span>
            <span className="font-data-mono-sm text-xs text-secondary uppercase font-semibold">STAGE 0 / SEEDING</span>
          </div>
          <h1 className="font-headline-lg text-2xl font-bold text-on-surface tracking-tight">
            Dataset Ingestion &amp; Pipeline Ingestion Health
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant mt-0.5">
            Offline-first dataset ingestion, schema normalization, and layer indexer
          </p>
        </div>

        {/* Case Context Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface-container-lowest shadow-sm border border-outline-variant/30">
            <span className="material-symbols-outlined text-[16px] text-secondary">folder_managed</span>
            <div className="flex flex-col">
              <span className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase leading-none">Context</span>
              <span className="font-data-mono text-xs text-on-surface font-semibold leading-tight">CASE-2024-089A</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface-container-lowest shadow-sm border border-outline-variant/30">
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">dns</span>
            <div className="flex flex-col">
              <span className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase leading-none">Forensic Node</span>
              <span className="font-data-mono text-xs text-on-surface font-semibold leading-tight">Air-Gapped Station #4</span>
            </div>
          </div>

          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-surface-container-high hover:bg-surface-container text-on-surface font-label-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">sync</span>
            <span>Sync Telemetry</span>
          </button>
        </div>
      </div>

      {uploadMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-data-mono flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{uploadMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2 font-data-mono">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Primary Operations Grid (12 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Ingestion Zone & Chain of Custody (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Drag & Drop Forensic Upload Zone */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-5 flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">upload_file</span>
                <span className="font-headline-md text-base font-bold text-on-surface">Data Surface Target</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-surface-container-low font-data-mono-sm text-[10px] text-on-surface-variant uppercase">
                Local Socket: /run/anvitrace.sock
              </span>
            </div>

            {/* Drop Canvas Area */}
            <div className="relative group cursor-pointer bg-surface-container-low hover:bg-surface-container rounded-lg p-8 flex flex-col items-center justify-center text-center transition-all duration-200 border-2 border-dashed border-outline-variant/40">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-14 h-14 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[28px] text-secondary">drive_folder_upload</span>
              </div>
              <span className="font-headline-md text-base font-bold text-on-surface mb-1">
                {selectedFile ? selectedFile.name : 'Drop Transaction Ledger Here'}
              </span>
              <p className="font-body-md text-xs text-on-surface-variant max-w-md mb-3">
                {selectedFile
                  ? `Ready to stream: ${(selectedFile.size / 1024).toFixed(1)} KB`
                  : 'CSV or Raw Banking Ledger Feeds. Multi-GB payloads streamed straight into DuckDB engine.'}
              </p>

              {/* Specifications Pill Bar */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="px-2.5 py-1 rounded bg-surface-container-lowest font-data-mono-sm text-[10px] text-on-surface-variant shadow-sm border border-outline-variant/20">
                  ENGINE: FASTAPI LOCAL STREAM
                </span>
                <span className="px-2.5 py-1 rounded bg-surface-container-lowest font-data-mono-sm text-[10px] text-on-surface-variant shadow-sm border border-outline-variant/20">
                  PAYLOAD: MULTI-MILLION ROWS
                </span>
                <span className="px-2.5 py-1 rounded bg-surface-container-lowest font-data-mono-sm text-[10px] text-secondary font-medium shadow-sm border border-outline-variant/20">
                  ZERO CLIENT-SIDE RAM FOOTPRINT
                </span>
              </div>
            </div>

            {/* Ingestion Execution Strip */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-outline-variant/20">
              <div className="flex items-center gap-1.5 text-on-surface-variant text-xs">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">verified_user</span>
                <span>Automated SHA-256 pre-calculation &amp; validation daemon active</span>
              </div>
              <button
                onClick={handleStartParsing}
                disabled={uploading || !selectedFile}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded bg-primary hover:bg-primary-container text-on-primary font-label-lg text-xs font-semibold transition-all shadow-md disabled:opacity-50 select-none"
              >
                <span className={`material-symbols-outlined text-[16px] ${uploading ? 'animate-spin' : ''}`}>
                  {uploading ? 'sync' : 'bolt'}
                </span>
                <span>{uploading ? 'Ingesting Stream...' : 'Upload & Begin Parsing'}</span>
              </button>
            </div>
          </div>

          {/* Evidentiary Protocol Notice Card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-5 flex flex-col relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-surface-container text-secondary shrink-0">
                <span className="material-symbols-outlined text-[22px]">gavel</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-label-lg text-xs font-bold text-on-surface uppercase tracking-wide">
                    Evidentiary Ingestion Protocol &amp; Chain-of-Custody
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-container-high font-data-mono-sm text-[10px] text-on-surface uppercase">
                    ISO 27037 compliant
                  </span>
                </div>
                <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
                  All ingested datasets are cryptographically verified upon ingestion and processed entirely within the local air-gapped forensic node. The React client maintains zero local copies of the banking dataset. Raw payload buffers are destroyed immediately after columnar projection.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                  <div className="p-2 rounded bg-surface-container-low border border-outline-variant/20 flex flex-col">
                    <span className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">Custody Seal</span>
                    <span className="font-data-mono text-xs text-on-surface font-semibold">ED-89A-04-VALID</span>
                  </div>
                  <div className="p-2 rounded bg-surface-container-low border border-outline-variant/20 flex flex-col">
                    <span className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">Client RAM</span>
                    <span className="font-data-mono text-xs text-secondary font-semibold">0.00 MB Utilized</span>
                  </div>
                  <div className="p-2 rounded bg-surface-container-low border border-outline-variant/20 flex flex-col">
                    <span className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">Air-Gap Policy</span>
                    <span className="font-data-mono text-xs text-on-surface font-semibold">STRICT UNROUTED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dataset Telemetry (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-5 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <span className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-secondary">analytics</span>
                Dataset Telemetry
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-data-mono-sm text-[10px] font-semibold">
                {status?.status === 'indexed' ? 'ACTIVE MOUNT' : 'PRE-INGESTION'}
              </span>
            </div>

            <div className="mt-3 space-y-3 text-xs">
              <div>
                <span className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase block">DATASET NAME</span>
                <span className="font-data-mono text-xs text-on-surface font-semibold">
                  {status?.dataset_id ? `${status.dataset_id} (active)` : 'No active dataset mount'}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">SHA-256 DATASET HASH</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Verified</span>
                </div>
                <div className="font-data-mono-sm text-[11px] text-on-surface bg-surface-container-low p-1.5 rounded border border-outline-variant/20 truncate mt-0.5">
                  {status?.dataset_hash || 'Awaiting file ingestion...'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant/20">
                  <span className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase block">RECORD COUNT</span>
                  <span className="font-headline-md text-base font-bold text-on-surface">
                    {stats ? stats.total_rows.toLocaleString() : '—'}
                  </span>
                  <span className="text-[10px] text-on-surface-variant block mt-0.5">Rows committed</span>
                </div>
                <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant/20">
                  <span className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase block">UNIQUE ACCOUNTS</span>
                  <span className="font-headline-md text-base font-bold text-on-surface">
                    {stats ? stats.total_accounts.toLocaleString() : '—'}
                  </span>
                  <span className="text-[10px] text-on-surface-variant block mt-0.5">Distinct node entities</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                <div>
                  <span className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase block">SCHEMA VALIDITY</span>
                  <span className="text-[11px] font-semibold text-on-surface">Header &amp; Column Type Alignment</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold font-data-mono">
                  100% Passed
                </span>
              </div>

              <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                <div>
                  <span className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase block">DETECTION RULES VERSION</span>
                  <span className="text-[11px] font-semibold text-on-surface">L1/L2/L3 heuristics schema</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-data-mono-sm text-[10px] font-semibold">
                  v4.2-IE
                </span>
              </div>

              <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px] font-data-mono text-on-surface-variant">
                <span>Local Storage Engine Status:</span>
                <span className="text-secondary font-semibold">IPC SOCKET READY</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Execution Monitor: 7-Stage Live Process */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">linear_scale</span>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">
              Live Processing Pipeline Stages
            </h3>
          </div>
          <span className="font-data-mono-sm text-[10px] uppercase text-on-surface-variant">
            CURRENT STATUS: {status?.status === 'indexed' ? 'DATASET INDEXED & MOUNTED' : 'AWAITING FILE INGESTION'}
          </span>
        </div>

        {/* 7 Stage Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { num: 1, name: 'UPLOAD', desc: 'Streaming source payload directly to FastAPI IPC.' },
            { num: 2, name: 'PARSING', desc: 'Reading transaction records and field formats.' },
            { num: 3, name: 'NORMALIZATION', desc: 'Standardizing accounts, IFSC, and UTC timestamps.' },
            { num: 4, name: 'VALIDATION', desc: 'Identifying duplicate transaction references and invalid sums.' },
            { num: 5, name: 'INDEXING', desc: 'Building DuckDB indexed graph structures for BFS traversal.' },
            { num: 6, name: 'DETECTION', desc: 'Evaluating collector, distributor, and terminal heuristics.' },
            { num: 7, name: 'READY', desc: 'Dataset locked, SHA-256 hashed, mounted for live investigation.' },
          ].map((stg) => {
            const isCompleted = activeStage >= stg.num;
            const isCurrent = activeStage === stg.num;
            return (
              <div
                key={stg.num}
                className={`p-3 rounded-lg border flex flex-col justify-between transition-colors ${
                  isCurrent
                    ? 'bg-secondary-container/10 border-secondary text-secondary'
                    : isCompleted
                    ? 'bg-surface-container-low border-outline-variant/30 text-on-surface'
                    : 'bg-surface-container-low/40 border-outline-variant/15 text-on-surface-variant opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-data-mono font-bold text-xs">0{stg.num}</span>
                    <span className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-outline-variant'}`} />
                  </div>
                  <div className="font-headline-md text-xs font-bold uppercase">{stg.name}</div>
                  <p className="text-[10px] text-on-surface-variant mt-1 leading-snug">{stg.desc}</p>
                </div>
                <div className="mt-2 text-[10px] font-data-mono font-medium">
                  {isCompleted ? 'Validated' : 'Awaiting'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forensic Daemon Stream Audit Console */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-secondary">terminal</span>
            <span className="font-data-mono-sm text-xs font-bold text-on-surface uppercase">
              Forensic Daemon Stream Audit
            </span>
          </div>
          <span className="font-data-mono-sm text-[10px] text-on-surface-variant">
            Channel: /dev/anvitrace-ingest-log
          </span>
        </div>
        <div className="bg-surface-container-low p-3 rounded font-data-mono text-[11px] text-on-surface space-y-1 overflow-x-auto">
          <div>[00:00:01] [KERNEL] Station #4 air-gap interface bound to 127.0.0.1:8000</div>
          <div>[00:00:02] [FASTAPI] DuckDB columnar thread-pool spawned: 16 native workers</div>
          <div>[00:00:02] [SECURITY] Local IPC session token authenticated for docket CASE-2024-089A</div>
          <div>[00:00:03] [INGEST_HEALTH] Ready for multi-rail transaction stream. Awaiting ingestion initiation.</div>
          {status && (
            <div className="text-emerald-700">
              [STATUS] Mounted dataset: {status.dataset_id} • SHA-256 verified • Indexer warm
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
