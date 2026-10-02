import React, { useState } from 'react';

interface CaseManagementViewProps {
  onInvestigateAccount: (accountId: string) => void;
  onNavigateToDataset: () => void;
  onNavigateToDocuments: () => void;
}

interface CaseDocket {
  id: string;
  subId: string;
  title: string;
  act: string;
  officer: string;
  badge: string;
  dataset: string;
  targets: number;
  status: 'Active Lead' | 'Sealed Evidence' | 'Court Diary Gen.';
}

export const CaseManagementView: React.FC<CaseManagementViewProps> = ({
  onInvestigateAccount,
  onNavigateToDataset,
  onNavigateToDocuments,
}) => {
  const [filterText, setFilterText] = useState('');
  const [selectedCase, setSelectedCase] = useState<string>('CASE-2024-089A');
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);

  const dockets: CaseDocket[] = [
    {
      id: 'CASE-2024-089A',
      subId: 'CR-65B-9982',
      title: 'Cyber Cell Mule Ring Probe - Sector 4',
      act: 'Sec. 66D IT Act / 420 IPC',
      officer: 'Inv. D. Vance',
      badge: '#408',
      dataset: 'DS-2024-89',
      targets: 34,
      status: 'Active Lead',
    },
    {
      id: 'CASE-2024-072F',
      subId: 'CR-102-4113',
      title: 'Offshore Shell Layering Syndicate',
      act: 'Sec. 3 PMLA (Proceeds of Crime)',
      officer: 'Insp. R. Thorne',
      badge: '#219',
      dataset: 'DS-2024-72',
      targets: 118,
      status: 'Sealed Evidence',
    },
    {
      id: 'CASE-2024-061B',
      subId: 'CR-43A-8004',
      title: 'Unauthorized API Settlement Drain',
      act: 'Sec. 43/66 IT Act & 409 IPC',
      officer: 'Det. K. Mercer',
      badge: '#587',
      dataset: 'DS-2024-61',
      targets: 52,
      status: 'Court Diary Gen.',
    },
    {
      id: 'CASE-2024-049E',
      subId: 'CR-120B-555',
      title: 'Micro-Lending App Extortion Vector',
      act: 'Sec. 384/506 IPC / 67 IT Act',
      officer: 'Inv. D. Vance',
      badge: '#408',
      dataset: 'DS-2024-49',
      targets: 88,
      status: 'Active Lead',
    },
  ];

  const filteredDockets = dockets.filter(
    (d) =>
      d.id.toLowerCase().includes(filterText.toLowerCase()) ||
      d.title.toLowerCase().includes(filterText.toLowerCase()) ||
      d.officer.toLowerCase().includes(filterText.toLowerCase()) ||
      d.act.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Command Header & Breadcrumb Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-data-mono-sm text-xs uppercase tracking-wider text-secondary font-semibold">
              Registry // Section 65B Certified
            </span>
            <span className="w-1 h-1 rounded-full bg-outline" />
            <span className="font-data-mono-sm text-xs text-on-surface-variant">Auth Node #0408-IN</span>
          </div>
          <h1 className="font-headline-lg text-2xl font-bold text-on-surface tracking-tight">
            Case Management &amp; Evidentiary Registry
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant mt-0.5">
            Manage formal investigation dockets, jurisdictional boundaries, and chain-of-custody verification logs.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigateToDocuments()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors shadow-sm font-label-lg text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[16px]">folder_special</span>
            <span>Statutory Documents</span>
          </button>
          <button
            onClick={() => onNavigateToDataset()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors shadow-sm font-label-lg text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[16px]">file_open</span>
            <span>Import Case Dossier</span>
          </button>
          <button
            onClick={() => alert('New formal docket wizard: CASE-2024-090 created under Indian IT Act.')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-secondary-container text-on-primary hover:opacity-95 transition-opacity shadow-sm font-label-lg text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Create New Docket</span>
          </button>
        </div>
      </div>

      {/* Operational Stat Cadence */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs text-on-surface-variant uppercase tracking-wider">Active Dockets</span>
            <span className="material-symbols-outlined text-secondary text-[20px]">folder_managed</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-headline-xl text-3xl font-bold text-on-surface">14</span>
            <span className="font-data-mono-sm text-xs text-secondary font-medium">+2 This Week</span>
          </div>
          <span className="font-body-sm text-[11px] text-on-surface-variant mt-1">Across 3 regional jurisdiction rings</span>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs text-on-surface-variant uppercase tracking-wider">Identified Targets</span>
            <span className="material-symbols-outlined text-on-surface text-[20px]">target</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-headline-xl text-3xl font-bold text-on-surface">342</span>
            <span className="font-data-mono-sm text-xs text-on-surface-variant">Accounts Tracked</span>
          </div>
          <span className="font-body-sm text-[11px] text-on-surface-variant mt-1">PMLA / CrPC Freeze Notices Issued</span>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs text-on-surface-variant uppercase tracking-wider">Evidentiary Seals</span>
            <span className="material-symbols-outlined text-on-surface text-[20px]">encrypted</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-headline-xl text-3xl font-bold text-on-surface">89</span>
            <span className="font-data-mono-sm text-xs text-on-surface-variant">SHA-256 Validated</span>
          </div>
          <span className="font-body-sm text-[11px] text-on-surface-variant mt-1">Zero cryptographic integrity violations</span>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs text-on-surface-variant uppercase tracking-wider">Court Diaries</span>
            <span className="material-symbols-outlined text-on-surface text-[20px]">gavel</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-headline-xl text-3xl font-bold text-on-surface">06</span>
            <span className="font-data-mono-sm text-xs text-secondary font-medium">Ready for Prosecution</span>
          </div>
          <span className="font-body-sm text-[11px] text-on-surface-variant mt-1">Sub judice: Special Courts (Financial Crimes)</span>
        </div>
      </div>

      {/* Primary Working Area: Selected Case Context + Registry Ledger */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left/Center: Active Dockets Matrix (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col">
            {/* Control Strip */}
            <div className="p-3.5 bg-surface-container-low border-b border-outline-variant/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-headline-md text-sm font-bold text-on-surface">Investigative Dockets</span>
                <span className="px-2 py-0.5 rounded bg-surface-container font-data-mono-sm text-[11px] text-on-surface-variant">
                  {filteredDockets.length} Records
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 material-symbols-outlined text-[16px] text-on-surface-variant">filter_alt</span>
                  <input
                    className="bg-surface-container-lowest pl-8 pr-3 py-1.5 rounded text-on-surface font-body-sm text-xs placeholder:text-on-surface-variant focus:outline-none border border-outline-variant/30 w-56"
                    placeholder="Filter by FIR / Section / IO..."
                    type="text"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => alert('Exporting dockets ledger as TSV...')}
                  className="p-1.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
                  title="Export Ledger TSV"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                </button>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container/60 text-on-surface-variant font-label-md uppercase tracking-wider text-[11px] border-b border-outline-variant/20">
                    <th className="py-2.5 px-3">Case Identifier</th>
                    <th className="py-2.5 px-3">Title / Scope</th>
                    <th className="py-2.5 px-3">Lead Officer</th>
                    <th className="py-2.5 px-3 text-center">Dataset</th>
                    <th className="py-2.5 px-3 text-right">Targets</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15">
                  {filteredDockets.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedCase(d.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedCase === d.id ? 'bg-surface-container-low font-medium' : 'hover:bg-surface-container-low/50'
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="font-data-mono font-bold text-on-surface">{d.id}</div>
                        <div className="font-data-mono-sm text-[10px] text-on-surface-variant">{d.subId}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-on-surface">{d.title}</div>
                        <div className="text-[10px] text-on-surface-variant">{d.act}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div>{d.officer}</div>
                        <div className="text-[10px] text-secondary font-medium">Badge {d.badge}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-surface-container font-data-mono-sm text-[10px] text-on-surface">
                          {d.dataset}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-data-mono font-semibold">{d.targets}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-data-mono font-semibold ${
                            d.status === 'Active Lead'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : d.status === 'Sealed Evidence'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInvestigateAccount('ACC_VIC_P4001');
                          }}
                          className="px-2 py-1 rounded bg-primary text-on-primary hover:bg-primary-container text-[11px] font-medium"
                        >
                          Open Trace
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Summary Strip */}
            <div className="p-3 bg-surface-container-low border-t border-outline-variant/20 flex flex-wrap items-center justify-between text-[11px] font-data-mono text-on-surface-variant gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />4 High Priority
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />7 Sealed For Trial
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />3 Pending Judicial Direction
                </span>
              </div>
              <div>Master Audit Key: 0x7F2A...B9C1</div>
            </div>
          </div>

          {/* Officer Chain-of-Custody Log */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">history_edu</span>
                <h3 className="font-headline-md text-sm font-bold text-on-surface">Officer Chain-of-Custody Log</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-surface-container font-data-mono-sm text-[10px] text-on-surface-variant">
                Immutable Cryptographic Journal
              </span>
            </div>
            <div className="space-y-2.5">
              <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-start justify-between">
                <div>
                  <div className="font-data-mono-sm text-[10px] text-on-surface-variant">2026-10-02 07:15 UTC</div>
                  <div className="font-semibold text-xs text-on-surface mt-0.5">Snapshot Seal Executed: CR-65B-9982</div>
                  <div className="text-[11px] text-on-surface-variant">
                    Lead Inv. D. Vance anchored SHA-256 hash payload to local ledger.
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-data-mono font-medium">
                  Sec. 65B Verified
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-start justify-between">
                <div>
                  <div className="font-data-mono-sm text-[10px] text-on-surface-variant">2026-10-02 06:40 UTC</div>
                  <div className="font-semibold text-xs text-on-surface mt-0.5">Subpoena Directive Linked: 48 New Mule Nodes</div>
                  <div className="text-[11px] text-on-surface-variant">
                    State Cyber Crime Division appended IFSC routing verification.
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-data-mono font-medium">
                  CrPC 102 Notice
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Active Case Dossier (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-data-mono-sm text-[10px] uppercase tracking-wider text-secondary font-bold">
                ACTIVE CASE DOSSIER
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-data-mono font-semibold">
                SEC-102 READY
              </span>
            </div>

            <h2 className="font-headline-lg text-lg font-bold text-on-surface">{selectedCase}</h2>
            <div className="text-xs text-on-surface-variant mt-0.5">Cyber Cell Mule Ring Probe - Sector 4</div>
            <div className="text-[11px] text-on-surface-variant mt-1">
              Law Enforcement Agency: State Cyber Crime Division (HQ East)
            </div>

            <div className="mt-4 pt-3 border-t border-outline-variant/20 space-y-3">
              <div>
                <div className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">ASSIGNED DATASET</div>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="font-semibold text-on-surface">Awaiting Ingestion / Active Mount</span>
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">folder</span>
                </div>
                <div className="font-data-mono-sm text-[10px] text-on-surface-variant mt-0.5">
                  Partition ID: #DS-RWR-89A-001
                </div>
              </div>

              <div>
                <div className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase">LINKED FORENSIC SNAPSHOTS</div>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="font-medium text-on-surface">0 Active Snapshots</span>
                  <span className="px-1.5 py-0.2 rounded bg-surface-container text-[10px] font-data-mono">Queue Ready</span>
                </div>
                <div className="text-[10px] text-on-surface-variant mt-0.5">Awaiting Lead Investigator Query Execution</div>
              </div>

              <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant/20">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                  <span>Statutory Compliance Check</span>
                </div>
                <div className="font-data-mono-sm text-[10px] text-on-surface-variant mt-1">
                  Air-Gapped Hardware Signature Valid • TPM 2.0 Attested Node #040X
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                onClick={() => onInvestigateAccount('ACC_VIC_P4001')}
                className="w-full py-2 px-3 rounded bg-primary hover:bg-primary-container text-on-primary font-label-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">travel_explore</span>
                <span>Proceed to Account Search</span>
              </button>

              <button
                onClick={() => onNavigateToDataset()}
                className="w-full py-2 px-3 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>Ingest Case Dataset (CSV/TSV/OFX)</span>
              </button>

              <button
                onClick={() => setShowCertificateModal(true)}
                className="w-full py-2 px-3 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                <span>Generate Sec. 65B Certificate</span>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-outline-variant/20 text-center">
              <span className="text-[10px] font-data-mono text-secondary uppercase font-semibold">
                Court Case Status: Sub STRICT SEAL JUDICE ACTIVE
              </span>
            </div>
          </div>

          {/* Statutory Scope Reference */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-4">
            <span className="font-data-mono-sm text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
              STATUTORY SCOPE REFERENCE
            </span>
            <div className="mt-2 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-outline-variant/15">
                <span className="font-data-mono font-semibold text-on-surface">Sec. 102 CrPC</span>
                <span className="text-on-surface-variant text-[11px]">Freezing of Bank Accounts</span>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-outline-variant/15">
                <span className="font-data-mono font-semibold text-on-surface">Sec. 66D IT Act</span>
                <span className="text-on-surface-variant text-[11px]">Cheating by Personation</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-data-mono font-semibold text-on-surface">Sec. 5(1) PMLA</span>
                <span className="text-on-surface-variant text-[11px]">Attachment of Property</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Section 65B Certificate */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-xl w-full rounded-xl shadow-2xl border border-outline-variant/40 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[24px]">workspace_premium</span>
                <h3 className="font-headline-md text-base font-bold text-on-surface">
                  Certificate under Section 65B of Indian Evidence Act, 1872
                </h3>
              </div>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="text-xs text-on-surface-variant leading-relaxed space-y-2">
              <p>
                I, <strong>Inv. D. Vance</strong>, Forensic Lead #408, State Cyber Crime Division, do hereby certify that the electronic records contained in docket <strong>{selectedCase}</strong> were produced by computer systems operating under lawful control in an air-gapped, offline environment.
              </p>
              <div className="p-3 bg-surface-container-low rounded border border-outline-variant/30 font-data-mono text-[11px]">
                <div>• Machine Signature: NODE-0408-IN-TPM2.0</div>
                <div>• Dataset SHA-256: 7f2ad49b9c1042...88f1</div>
                <div>• Integrity Verification: 100% Deterministic (Zero Tampering)</div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
              <button
                onClick={() => setShowCertificateModal(false)}
                className="px-3 py-1.5 rounded bg-surface-container text-on-surface text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert('Certificate generated and cryptographically sealed.');
                  setShowCertificateModal(false);
                }}
                className="px-4 py-1.5 rounded bg-secondary-container text-on-primary text-xs font-semibold"
              >
                Download Signed PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
