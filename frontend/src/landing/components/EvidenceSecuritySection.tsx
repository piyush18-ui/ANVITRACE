import React from 'react';
import { 
  FileText, 
  Lock, 
  ShieldCheck, 
  Hash, 
  CheckCircle2, 
  Cpu, 
  Printer, 
  Download,
  AlertCircle
} from 'lucide-react';

export const EvidenceSecuritySection: React.FC = () => {
  return (
    <section id="security" className="py-20 bg-[#fafafc] border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold tracking-wider uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>EVIDENCE &amp; TRUST</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight leading-tight mb-4">
            From Investigation to <br />
            <span className="underline decoration-amber-500 decoration-2 underline-offset-4">Actionable Evidence</span>
          </h2>

          <p className="text-base text-zinc-600 leading-relaxed">
            Generate verified case diaries and freeze requisitions with tamper-proof cryptographic provenance. All artifacts are generated locally without any cloud exposure.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Document 1: CASE DIARY PREVIEW (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-zinc-200 p-5 shadow-xs flex flex-col justify-between relative group hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-900" />
                  <span className="text-xs font-bold text-zinc-950 uppercase">Case Diary Entry</span>
                </div>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/60 text-[9px] font-bold rounded uppercase">
                  DRAFT • SECTION 172 CrPC
                </span>
              </div>

              {/* Factual Document Body */}
              <div className="bg-zinc-50 rounded-lg border border-zinc-200 p-4 space-y-2.5 font-mono text-[11px] text-zinc-700 shadow-2xs">
                <div className="flex justify-between border-b border-zinc-200/70 pb-1">
                  <span className="text-zinc-500 font-sans">Reference</span>
                  <span className="font-bold text-zinc-950">CD-2026-IND-017</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200/70 pb-1">
                  <span className="text-zinc-500 font-sans">Timestamp</span>
                  <span>2026-09-20 16:30 IST</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200/70 pb-1">
                  <span className="text-zinc-500 font-sans">Target Acc</span>
                  <span className="font-bold text-zinc-950">8123 4XX 97XX</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200/70 pb-1">
                  <span className="text-zinc-500 font-sans">Bank &amp; IFSC</span>
                  <span>HDFC (HDFC0001824)</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200/70 pb-1">
                  <span className="text-zinc-500 font-sans">Attributed Hop</span>
                  <span className="font-bold text-rose-600">₹5,90,000 (Hop 2)</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-sans block mb-1">SHA-256 Provenance Hash:</span>
                  <span className="text-[9px] text-zinc-600 break-all leading-tight block bg-white p-1.5 rounded border border-zinc-200">
                    a83f9401b2c45e89a3df...e021a8
                  </span>
                </div>
              </div>

              <div className="mt-3 text-[10px] text-zinc-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Generated draft requires Investigating Officer sign-off.</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-200">
              <div className="text-[10px] font-semibold text-zinc-900 flex items-center gap-1">
                <Printer className="w-3 h-3 text-zinc-600" />
                <span>Court-Ready Standard Template</span>
              </div>
            </div>
          </div>

          {/* Document 2: BANK FREEZE REQUISITION (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-zinc-200 p-5 shadow-xs flex flex-col justify-between relative group hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-900" />
                  <span className="text-xs font-bold text-zinc-950 uppercase">Freeze Requisition</span>
                </div>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 text-[9px] font-bold rounded uppercase">
                  VERIFIED DRAFT
                </span>
              </div>

              {/* Factual Document Body */}
              <div className="bg-zinc-50 rounded-lg border border-zinc-200 p-4 space-y-2.5 font-mono text-[11px] text-zinc-700 shadow-2xs">
                <div className="flex justify-between border-b border-zinc-200/70 pb-1">
                  <span className="text-zinc-500 font-sans">Nodal Officer</span>
                  <span className="font-bold text-zinc-950">Chief Compliance Officer</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200/70 pb-1">
                  <span className="text-zinc-500 font-sans">Section</span>
                  <span>91 / 102 CrPC Hold</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200/70 pb-1">
                  <span className="text-zinc-500 font-sans">Beneficiary</span>
                  <span className="font-bold text-zinc-950">M/S S*** Trading Corp</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200/70 pb-1">
                  <span className="text-zinc-500 font-sans">Account No</span>
                  <span className="font-bold text-zinc-950">8123 4XX 97XX</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200/70 pb-1">
                  <span className="text-zinc-500 font-sans">Freeze Target</span>
                  <span className="font-bold text-emerald-700">₹4,82,500.00</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-sans block mb-1">Audit Ledger Hash:</span>
                  <span className="text-[9px] text-zinc-600 break-all leading-tight block bg-white p-1.5 rounded border border-zinc-200">
                    7c11f008d4e92a71bf38...4990c2
                  </span>
                </div>
              </div>

              <div className="mt-3 text-[10px] text-zinc-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Observed Net Flow is transaction-derived, not live bank API balance.</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-200">
              <div className="text-[10px] font-semibold text-zinc-900 flex items-center gap-1">
                <Download className="w-3 h-3 text-zinc-600" />
                <span>Export Official Notice Draft</span>
              </div>
            </div>
          </div>

          {/* Trust & Security Panel (4 cols) */}
          <div className="lg:col-span-4 bg-[#090d16] text-white rounded-xl p-6 shadow-md border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  Forensic Trust Architecture
                </h3>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                ANVITRACE is built for maximum evidentiary reliability. Every query and trace can be verified independently in a courtroom setting.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Lock className="w-4 h-4 text-zinc-300" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">100% Offline Core</div>
                    <div className="text-[11px] text-zinc-400 leading-normal">
                      Zero cloud dependency. Runs fully air-gapped on forensic hardware without external data leaks.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Hash className="w-4 h-4 text-zinc-300" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">SHA-256 Chain of Custody</div>
                    <div className="text-[11px] text-zinc-400 leading-normal">
                      Every ingested row, index, and generated case report is cryptographically bound to its root hash.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Cpu className="w-4 h-4 text-zinc-300" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Deterministic Execution</div>
                    <div className="text-[11px] text-zinc-400 leading-normal">
                      Powered by embedded DuckDB analytics. 100% reproducible investigations across repeated runs.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Evidence-Linked Findings</div>
                    <div className="text-[11px] text-zinc-400 leading-normal">
                      No orphaned claims. Every risk signal maps to an explicit counterparty transaction record.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-zinc-800 text-[10px] text-zinc-500">
              Compliant with cyber-forensic chain of custody protocols.
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
