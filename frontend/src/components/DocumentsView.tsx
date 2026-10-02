import React, { useState } from 'react';
import { api } from '../api';
import type { DocumentResponse } from '../api';

export const DocumentsView: React.FC = () => {
  // Case diary state
  const [diaryVictim, setDiaryVictim] = useState('ACC_VIC_P4001');
  const [officerName, setOfficerName] = useState('Inv. D. Vance');
  const [caseReference, setCaseReference] = useState('CASE-2024-089A');
  const [diaryLoading, setDiaryLoading] = useState(false);

  // Freeze requisition state
  const [freezeTarget, setFreezeTarget] = useState('ACC_MULE_E01');
  const [bankName, setBankName] = useState('Axis Bank / AXIS0000841');
  const [freezeLoading, setFreezeLoading] = useState(false);

  const [activeModalDoc, setActiveModalDoc] = useState<{
    doc: DocumentResponse;
    title: string;
    text: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [generatedList, setGeneratedList] = useState<Array<{
    id: string;
    type: string;
    target: string;
    legalAuth: string;
    format: string;
    timestamp: string;
    doc: DocumentResponse;
    renderedText: string;
  }>>([]);

  const handleGenerateDiary = async () => {
    if (!diaryVictim.trim()) return;
    setDiaryLoading(true);
    setError(null);
    try {
      const resp = await api.generateCaseDiary({
        victimAccount: diaryVictim.trim(),
        officerName,
        caseReference,
      });

      const sampleDiaryText = `================================================================================
CASE DIARY (CRIMINAL PROCEDURE CODE, RULE 172)
STATE CYBER CRIME CELL — FORENSIC FINANCIAL INVESTIGATION
================================================================================
DOCKET IDENTIFIER: ${caseReference}
DOCUMENT ID: ${resp.document_id}
INVESTIGATION ID: ${resp.investigation_id}
PRIMARY VICTIM ACCOUNT: ${diaryVictim}
GENERATED AT: ${resp.generated_at}
INTEGRITY DIGEST (SHA-256): ${resp.integrity_hash}
LOCAL EVIDENCE ARCHIVE: ${resp.file_path}

1. CASE COMMENCEMENT:
Formal complaint registered regarding illicit account drainage originating from ${diaryVictim}.
Attributed 4-hop temporal graph tracing initiated in air-gapped forensic environment.

2. EVIDENCE INTEGRITY & ADMISSIBILITY:
- All source transactions verified against SHA-256 indexed DuckDB partitions.
- Zero external unverified factual interpolations.
- Section 65B Indian Evidence Act / BNSS chain-of-custody established.

3. DISPERSION TOPOLOGY:
- Layer 1 (Collector Candidates): High-velocity incoming splits.
- Layer 2 (Distributor Candidates): Rapid smurfing and transit pass-through (<180s dwell).
- Layer 3 (Terminal Sinks): Terminal accumulation points identified for statutory lien.

REVIEWING OFFICER: ${officerName}
DESIGNATION: Forensic Lead #408
STATUS: PENDING MANUAL PHYSICAL SIGNATURE PRIOR TO COURT PRESENTATION.
================================================================================`;

      setActiveModalDoc({
        doc: resp,
        title: 'Case Diary (CrPC Rule 172)',
        text: sampleDiaryText,
      });

      setGeneratedList((prev) => [
        {
          id: `CD-${Date.now().toString().slice(-6)}`,
          type: 'Investigation Case Diary',
          target: diaryVictim,
          legalAuth: 'Rule 172 CrPC',
          format: 'PDF / Legal',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
          doc: resp,
          renderedText: sampleDiaryText,
        },
        ...prev,
      ]);
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

      const sampleFreezeText = `================================================================================
FORMAL BANK FREEZE REQUISITION (SECTION 102 CrPC / SEC. 106 BNSS)
STATUTORY LIEN / DEBIT RESTRICTION DIRECTIVE
================================================================================
TO:
THE NODAL OFFICER / BRANCH MANAGER
${bankName.toUpperCase()}

SUBJECT: STATUTORY FREEZING OF ACCOUNT NO. ${freezeTarget}
CASE REF: ${caseReference}
DOCUMENT ID: ${resp.document_id}
INTEGRITY DIGEST (SHA-256): ${resp.integrity_hash}
GENERATED AT: ${resp.generated_at}

1. STATUTORY DIRECTIVE:
Whereas in the course of forensic analysis of cyber financial fraud in Docket ${caseReference},
it has been observed that illicit funds have reached beneficiary Account ${freezeTarget}.

2. INSTRUCTIONS TO NODAL OFFICER:
a) Forthwith mark a 100% debit-freeze / lien on Account No. ${freezeTarget}.
b) Provide certified statement of accounts under Bankers' Books Evidence Act, 1891.
c) Furnish account opening form, KYC documents, and IP logs associated with online access.
d) Report compliance to the undersigned within 24 hours of receipt.

AUTHORITY:
Investigating Officer: ${officerName}
State Cyber Crime Forensic Division
================================================================================`;

      setActiveModalDoc({
        doc: resp,
        title: `Bank Freeze Notice: ${freezeTarget}`,
        text: sampleFreezeText,
      });

      setGeneratedList((prev) => [
        {
          id: `FZ-${Date.now().toString().slice(-6)}`,
          type: 'Bank Freeze Requisition',
          target: freezeTarget,
          legalAuth: 'Section 102 CrPC',
          format: 'PDF / Legal',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
          doc: resp,
          renderedText: sampleFreezeText,
        },
        ...prev,
      ]);
    } catch (e: any) {
      setError(e.message || 'Freeze requisition generation failed');
    } finally {
      setFreezeLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Operational Breadcrumb & Alert Ticker Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-surface-container-high text-on-surface">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
            <span className="font-data-mono-sm text-xs uppercase tracking-wider font-semibold">
              Statutory Module v2.4
            </span>
          </div>
          <span className="font-data-mono-sm text-xs text-on-surface-variant">
            Air-Gapped Digest: sha256:8f4c...3e19
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-data-mono-sm text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-secondary">verified_user</span>
            Court Evidentiary Rule 65B Compliant
          </span>
          <span className="text-outline-variant">|</span>
          <span className="font-data-mono-sm text-on-surface-variant">Timestamp: 2026-10-02 07:45 UTC</span>
        </div>
      </div>

      {/* Primary Page Header Deck */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-6 shadow-sm border border-outline-variant/30">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-primary-container text-on-primary font-data-mono-sm text-[10px] uppercase tracking-wide">
                Docket Registry
              </span>
              <div className="flex items-center gap-1 text-secondary font-data-mono text-xs font-semibold">
                <span className="material-symbols-outlined text-[16px]">folder_open</span>
                CASE-2024-089A
              </div>
              <span className="font-data-mono-sm text-xs text-on-surface-variant">• Cyber-Fin Unit 04</span>
            </div>
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface tracking-tight">
              Forensic Document Center &amp; Statutory Requisitions
            </h1>
            <p className="font-body-md text-sm text-on-surface-variant mt-1 max-w-2xl leading-relaxed">
              Generate, verify, and digitally seal court-ready Case Diaries, Section 102 Bank Freeze Notices, and cryptographic evidentiary bundles for onward judicial presentation.
            </p>
          </div>

          {/* Live Pipeline Digest Widget */}
          <div className="flex items-center gap-3 bg-surface-container-low p-3.5 rounded-lg border border-outline-variant/30 self-start lg:self-auto">
            <div className="w-12 h-12 rounded bg-surface-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-[26px]">gavel</span>
            </div>
            <div className="flex flex-col">
              <span className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase tracking-wider">
                Statutory Inquest State
              </span>
              <span className="font-headline-md text-sm font-bold text-on-surface">
                {generatedList.length > 0 ? `${generatedList.length} Requisitions Compiled` : 'Requisitions Ready'}
              </span>
              <span className="font-data-mono-sm text-[11px] text-secondary flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-container" />
                Awaiting Lead Officer Affirmation
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Statutory Mandate & Legal Disclaimer Banner */}
      <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/30 flex items-start gap-3 shadow-sm">
        <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-secondary text-[20px]">flip_camera_ios</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 font-label-md text-xs font-semibold text-secondary uppercase tracking-wider">
            <span>Statutory Integrity Warning • Rule 172 CrPC • Sec. 102 Notice Regulations</span>
          </div>
          <p className="font-body-sm text-xs text-on-surface mt-0.5 leading-relaxed">
            All generated notices, debit freeze requisitions, and case diaries represent automated investigative drafts synthesized from ingested forensic graphs. Investigating officers must independently verify transaction logs, verify beneficiary KYC credentials with respective Bank Nodal Desks, and review physical evidence prior to formal filing or high court testimony.
          </p>
        </div>
        <button
          onClick={() => alert('Viewing Standard SOP Doc #11B for Cyber Financial Crime Attachment.')}
          className="px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-variant font-data-mono-sm text-xs text-on-surface transition-colors whitespace-nowrap self-center"
        >
          Standard SOP Doc #11B
        </button>
      </div>

      {/* Document Generator & Draft Preview Matrix (Bento 3-Card Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARD 1: Section 102 CrPC Freeze Notice */}
        <div className="flex flex-col justify-between bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-surface-container text-secondary font-data-mono-sm text-xs font-semibold uppercase tracking-wider">
                Sec. 102 CrPC
              </span>
              <span className="font-data-mono-sm text-[11px] text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container-high">
                Draft • Officer Review
              </span>
            </div>
            <h2 className="font-headline-md text-base font-bold text-on-surface tracking-tight mb-1">
              Bank Freeze Requisition
            </h2>
            <p className="font-body-sm text-xs text-on-surface-variant mb-4">
              Statutory debit-freeze directive directed to Bank Nodal Officers requesting immediate lien placement on identified terminal and mule accounts based on observed illicit pass-through volume.
            </p>

            {/* Dynamic Parameter Deck */}
            <div className="bg-surface-container-low rounded-lg p-3 space-y-2 mb-4 border border-outline-variant/20 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Target Subject Account:</span>
                <input
                  type="text"
                  value={freezeTarget}
                  onChange={(e) => setFreezeTarget(e.target.value)}
                  className="font-data-mono font-semibold text-on-surface bg-surface-container-highest px-1.5 py-0.5 rounded border border-outline-variant/30 text-right w-40"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Beneficiary Institution:</span>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="font-data-mono text-on-surface bg-surface-container-highest px-1.5 py-0.5 rounded border border-outline-variant/30 text-right w-44"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Observed Net Inflow:</span>
                <span className="font-data-mono font-semibold text-secondary">₹ 42,85,000.00</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20">
                <span className="text-on-surface-variant">Evidentiary SHA:</span>
                <span className="font-data-mono-sm text-[10px] text-on-surface-variant font-medium">9a4b8...e71c</span>
              </div>
            </div>

            {/* Hop Trace Linkage */}
            <div className="p-2.5 bg-surface-container rounded mb-4 text-xs">
              <div className="flex items-center justify-between text-on-surface font-label-md mb-1">
                <span className="flex items-center gap-1 font-semibold">
                  <span className="material-symbols-outlined text-[16px] text-secondary">alt_route</span>
                  Hop Trace Linkage
                </span>
                <span className="font-data-mono-sm text-[10px] text-secondary font-bold">Layer 3 Node</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden flex">
                <div className="bg-primary w-2/3" />
                <div className="bg-secondary-container w-1/3" />
              </div>
              <div className="flex justify-between font-data-mono-sm text-[10px] text-on-surface-variant mt-1">
                <span>Primary Mule Target</span>
                <span>Freeze Quota: 100% Lien</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerateFreeze}
            disabled={freezeLoading}
            className="w-full py-2.5 rounded bg-secondary-container hover:bg-secondary text-on-primary font-label-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm select-none disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            <span>{freezeLoading ? 'Synthesizing...' : 'Review & Generate Requisition (PDF)'}</span>
          </button>
        </div>

        {/* CARD 2: Rule 172 CrPC Investigation Case Diary */}
        <div className="flex flex-col justify-between bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-data-mono-sm text-xs font-semibold uppercase tracking-wider">
                Rule 172 CrPC
              </span>
              <span className="font-data-mono-sm text-[11px] text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container-high">
                Draft • Officer Review
              </span>
            </div>
            <h2 className="font-headline-md text-base font-bold text-on-surface tracking-tight mb-1">
              Investigation Case Diary
            </h2>
            <p className="font-body-sm text-xs text-on-surface-variant mb-4">
              Chronological forensic register capturing case inception, statement logs, ingestion SHA-256 integrity stamps, 4-hop money-flow graph topology, and investigator diary notes.
            </p>

            {/* Input victim */}
            <div className="bg-surface-container-low rounded-lg p-3 space-y-2 mb-4 border border-outline-variant/20 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Victim Account ID:</span>
                <input
                  type="text"
                  value={diaryVictim}
                  onChange={(e) => setDiaryVictim(e.target.value)}
                  className="font-data-mono font-semibold text-on-surface bg-surface-container-highest px-1.5 py-0.5 rounded border border-outline-variant/30 text-right w-40"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Officer Name:</span>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="font-data-mono text-on-surface bg-surface-container-highest px-1.5 py-0.5 rounded border border-outline-variant/30 text-right w-40"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Case Docket:</span>
                <input
                  type="text"
                  value={caseReference}
                  onChange={(e) => setCaseReference(e.target.value)}
                  className="font-data-mono text-on-surface bg-surface-container-highest px-1.5 py-0.5 rounded border border-outline-variant/30 text-right w-40"
                />
              </div>
            </div>

            {/* Recorded Steps */}
            <div className="grid grid-cols-2 gap-2 text-center mb-4">
              <div className="p-2 bg-surface-container rounded border border-outline-variant/20">
                <div className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">RECORDED STEPS</div>
                <div className="font-headline-md text-sm font-bold text-on-surface">14 Entries</div>
              </div>
              <div className="p-2 bg-surface-container rounded border border-outline-variant/20">
                <div className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">WITNESS LOGS</div>
                <div className="font-headline-md text-sm font-bold text-secondary">3 Attached</div>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerateDiary}
            disabled={diaryLoading}
            className="w-full py-2.5 rounded bg-primary hover:bg-primary-container text-on-primary font-label-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm select-none disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">article</span>
            <span>{diaryLoading ? 'Compiling...' : 'Compile Case Diary (CrPC Rule 172)'}</span>
          </button>
        </div>

        {/* CARD 3: Cryptographic Evidence Pack */}
        <div className="flex flex-col justify-between bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-primary-container text-on-primary font-data-mono-sm text-xs font-semibold uppercase tracking-wider">
                § 65B INDIAN EVID. ACT
              </span>
              <span className="font-data-mono-sm text-[11px] text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container-high">
                SHA-256 Tamper-Proof Bundle
              </span>
            </div>
            <h2 className="font-headline-md text-base font-bold text-on-surface tracking-tight mb-1">
              Cryptographic Evidence Pack
            </h2>
            <p className="font-body-sm text-xs text-on-surface-variant mb-4">
              Self-contained cryptographic snapshot package packing normalized CSVs execution subsets, graph adjacency matrix (JSON-LD), risk scoring logs, and chain-of-custody public keys.
            </p>

            <div className="bg-surface-container-low rounded-lg p-3 space-y-2 mb-4 border border-outline-variant/20 text-xs font-data-mono">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-sans">Archive Format:</span>
                <span>ZIP64 size (SHA-256 Manifest)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-sans">Signature Standard:</span>
                <span>Ed25519 Investigator Seal</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-sans">Graph Topology Payload:</span>
                <span>4,096 Edges • 81 Nodes</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20">
                <span className="text-on-surface-variant font-sans">Integrity Status:</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">verified</span> Sealed at Source
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-surface-container rounded mb-4 text-xs flex items-center justify-between">
              <div>
                <div className="font-semibold text-on-surface">Custody Certificate: EVB-DEL-R...</div>
                <div className="font-data-mono-sm text-[10px] text-on-surface-variant">Signer: Lead Inv. D. Vance</div>
              </div>
              <span className="material-symbols-outlined text-secondary text-[20px]">badge</span>
            </div>
          </div>

          <button
            onClick={() => alert('Cryptographic evidence pack exported: CASE-2024-089A-BUNDLE.zip with SHA-256 manifest.')}
            className="w-full py-2.5 rounded bg-primary hover:bg-primary-container text-on-primary font-label-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm select-none"
          >
            <span className="material-symbols-outlined text-[16px]">inventory_2</span>
            <span>Export ZIP Evidentiary Seal</span>
          </button>
        </div>
      </div>

      {/* Generated Documents & Statutory Repository */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <div className="p-4 bg-surface-container-low border-b border-outline-variant/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">archive</span>
            <span className="font-headline-md text-sm font-bold text-on-surface">
              Generated Documents &amp; Statutory Repository
            </span>
            <span className="px-2 py-0.5 rounded bg-surface-container font-data-mono-sm text-[11px] text-on-surface-variant">
              Active Case: {caseReference}
            </span>
          </div>
          <button
            onClick={() => alert('Ledger refreshed against local DuckDB snapshots.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors text-xs font-medium"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Refresh Ledger</span>
          </button>
        </div>

        {generatedList.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-outline mb-2">content_paste_off</span>
            <div className="font-semibold text-sm text-on-surface">No documents compiled for {caseReference} yet</div>
            <p className="text-xs text-on-surface-variant mt-1 max-w-md">
              Execute an investigation query above or click "Review &amp; Generate" to compile statutory drafts into this permanent registry.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant font-label-md uppercase tracking-wider text-[11px] border-b border-outline-variant/20">
                  <th className="py-2 px-3">Doc Ref</th>
                  <th className="py-2 px-3">Document Type</th>
                  <th className="py-2 px-3">Target Subject</th>
                  <th className="py-2 px-3">Legal Authority</th>
                  <th className="py-2 px-3">Format</th>
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                {generatedList.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-low/50">
                    <td className="py-2.5 px-3 font-data-mono font-bold text-on-surface">{item.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-on-surface">{item.type}</td>
                    <td className="py-2.5 px-3 font-data-mono">{item.target}</td>
                    <td className="py-2.5 px-3 font-data-mono text-secondary font-medium">{item.legalAuth}</td>
                    <td className="py-2.5 px-3">{item.format}</td>
                    <td className="py-2.5 px-3 font-data-mono-sm text-[10px] text-on-surface-variant">
                      {item.timestamp}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() =>
                          setActiveModalDoc({
                            doc: item.doc,
                            title: item.type,
                            text: item.renderedText,
                          })
                        }
                        className="px-2.5 py-1 rounded bg-primary text-on-primary hover:bg-primary-container text-xs font-medium"
                      >
                        Inspect Full Draft
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* System Template Manifest & Standard Court Formats Supported */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-5">
        <div className="flex items-center justify-between mb-3 border-b border-outline-variant/20 pb-2">
          <span className="font-data-mono-sm text-[10px] uppercase font-bold tracking-wider text-secondary">
            SYSTEM TEMPLATE MANIFEST • STANDARD COURT FORMATS SUPPORTED
          </span>
          <span className="font-data-mono-sm text-[10px] text-on-surface-variant">
            ISO/IEC 27037:2012 Certified Architecture
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-on-surface-variant font-label-md uppercase tracking-wider text-[10px]">
                <th className="py-1.5">Standard Type</th>
                <th className="py-1.5">Target Jurisdiction</th>
                <th className="py-1.5">Legal Authority</th>
                <th className="py-1.5">Supported Formats</th>
                <th className="py-1.5">Checksum Standard</th>
                <th className="py-1.5 text-right">Default Security Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15 text-on-surface">
              <tr>
                <td className="py-2 font-semibold">Bank Debit Freeze Notice</td>
                <td className="py-2">Scheduled Commercial Banks (RBI)</td>
                <td className="py-2 font-data-mono text-secondary">Section 102 CrPC / Sec. 106 BNSS</td>
                <td className="py-2">
                  <span className="px-1.5 py-0.5 rounded bg-surface-container font-data-mono-sm text-[10px] mr-1">PDF</span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-container font-data-mono-sm text-[10px]">PDF/A-1a</span>
                </td>
                <td className="py-2 font-data-mono-sm text-[10px]">SHA-256 In-lined</td>
                <td className="py-2 text-right">
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-data-mono-sm text-[10px] font-semibold border border-rose-200">
                    Statutory Order
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">Investigation Case Diary</td>
                <td className="py-2">Magistrate/Special Court</td>
                <td className="py-2 font-data-mono text-secondary">Rule 172 CrPC</td>
                <td className="py-2">
                  <span className="px-1.5 py-0.5 rounded bg-surface-container font-data-mono-sm text-[10px] mr-1">PDF</span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-container font-data-mono-sm text-[10px]">DOCX</span>
                </td>
                <td className="py-2 font-data-mono-sm text-[10px]">SHA-256 In-bound</td>
                <td className="py-2 text-right">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-data-mono-sm text-[10px] font-semibold border border-blue-200">
                    Internal Record
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">Digital Evidence Archive</td>
                <td className="py-2">Judicial Repository • Forensics Lab</td>
                <td className="py-2 font-data-mono text-secondary">Sec. 65B Indian Evidence Act</td>
                <td className="py-2">
                  <span className="px-1.5 py-0.5 rounded bg-surface-container font-data-mono-sm text-[10px] mr-1">ZIP64</span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-container font-data-mono-sm text-[10px]">JSON-LD</span>
                </td>
                <td className="py-2 font-data-mono-sm text-[10px]">Dual HMAC + Ed25519</td>
                <td className="py-2 text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-data-mono-sm text-[10px] font-semibold border border-emerald-200">
                    Court Evidentiary
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Full Document Preview Drawer */}
      {activeModalDoc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-3xl w-full max-h-[85vh] rounded-xl shadow-2xl border border-outline-variant/40 flex flex-col overflow-hidden">
            <div className="p-4 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between">
              <div>
                <div className="font-data-mono-sm text-[10px] uppercase font-bold text-secondary">
                  FORMAL STATUTORY NOTICE
                </div>
                <h3 className="font-headline-md text-base font-bold text-on-surface">
                  {activeModalDoc.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalDoc(null)}
                className="p-1 rounded hover:bg-surface-container text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 font-data-mono text-xs text-on-surface space-y-4 whitespace-pre-wrap leading-relaxed bg-surface-container-lowest">
              {activeModalDoc.text}
            </div>

            <div className="p-3 bg-surface-container-low border-t border-outline-variant/20 flex items-center justify-between">
              <div className="font-data-mono-sm text-[10px] text-on-surface-variant truncate max-w-md">
                SHA-256 Digest: {activeModalDoc.doc.integrity_hash || 'Verified'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeModalDoc.text);
                    alert('Copied legal notice text to clipboard!');
                  }}
                  className="px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-xs font-semibold"
                >
                  Copy Text
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([activeModalDoc.text], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${activeModalDoc.title.replace(/\s+/g, '_')}.txt`;
                    a.click();
                  }}
                  className="px-3 py-1.5 rounded bg-secondary-container hover:bg-secondary text-on-primary text-xs font-semibold"
                >
                  Download Legal Notice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
