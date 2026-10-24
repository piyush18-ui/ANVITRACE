import React from 'react';
import { ArrowRight, Upload, Search, GitBranch, ShieldAlert, Cpu, FileText, CheckCircle2 } from 'lucide-react';

interface HowItWorksSectionProps {
  onLaunchInvestigation: () => void;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onLaunchInvestigation }) => {
  const steps = [
    {
      num: 1,
      title: 'Upload Data',
      desc: 'Import transaction datasets and related account information (CSV, PDF, or API).',
      cardContent: (
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs flex flex-col items-center justify-center text-center h-[180px]">
          <div className="w-11 h-11 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200 flex items-center justify-center mb-3">
            <Upload className="w-5 h-5 text-zinc-700" />
          </div>
          <div className="text-xs font-bold text-zinc-900">Drag &amp; drop files or browse</div>
          <div className="text-[10px] text-zinc-400 mt-1">Supports CSV, Parquet, JSON, DuckDB</div>
          <div className="mt-3 flex items-center gap-1.5 text-[9px] font-mono bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded">
            <span>2.4M rows • batch_2026_q3.csv</span>
          </div>
        </div>
      ),
    },
    {
      num: 2,
      title: 'Run Investigation',
      desc: 'Trace money flows, detect mule accounts and analyze risk patterns.',
      cardContent: (
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs flex flex-col justify-between h-[180px]">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-900 mb-1">
            <span>Investigation in Progress</span>
            <span className="text-[10px] font-mono text-amber-700 font-semibold">Running</span>
          </div>

          <div className="space-y-2 text-[10px]">
            <div>
              <div className="flex justify-between text-zinc-600 mb-0.5">
                <span>Processing transactions</span>
                <span className="font-bold text-emerald-700">100%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full w-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-zinc-600 mb-0.5">
                <span>Building network graph</span>
                <span className="font-bold text-zinc-900">78%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-800 rounded-full w-[78%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-zinc-600 mb-0.5">
                <span>Detecting mule accounts</span>
                <span className="font-bold text-zinc-900">45%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-700 rounded-full w-[45%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-zinc-600 mb-0.5">
                <span>Calculating risk scores</span>
                <span className="font-bold text-amber-700">20%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full w-[20%]" />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      num: 3,
      title: 'Get Results',
      desc: 'View interactive graphs, risk scores and export evidence ready reports.',
      cardContent: (
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs flex flex-col justify-between h-[180px]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Investigation Complete</span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-1 text-center">
            <div className="p-1.5 bg-zinc-50 rounded border border-zinc-200">
              <div className="text-base font-bold text-zinc-950 font-heading">37</div>
              <div className="text-[9px] text-zinc-500">Accounts Traced</div>
            </div>
            <div className="p-1.5 bg-zinc-50 rounded border border-zinc-200">
              <div className="text-base font-bold text-zinc-950 font-heading">4 Hops</div>
              <div className="text-[9px] text-zinc-500">Analyzed</div>
            </div>
            <div className="p-1.5 bg-zinc-50 rounded border border-zinc-200">
              <div className="text-xs font-bold text-zinc-950 font-mono">₹11,02,450</div>
              <div className="text-[9px] text-zinc-500">Amount Traced</div>
            </div>
            <div className="p-1.5 bg-zinc-50 rounded border border-zinc-200">
              <div className="text-base font-bold text-rose-600 font-heading">12</div>
              <div className="text-[9px] text-zinc-500">Mule Candidates</div>
            </div>
          </div>

          <button
            onClick={onLaunchInvestigation}
            className="w-full py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors shadow-xs"
          >
            <span>View Full Report</span>
            <ArrowRight className="w-3 h-3 text-zinc-300" />
          </button>
        </div>
      ),
    },
  ];

  const pipeline = [
    { num: '01', title: 'Ingest Data', desc: 'Load 2M+ transaction datasets in DuckDB' },
    { num: '02', title: 'Find Account', desc: 'Locate victim and focal dispute transactions' },
    { num: '03', title: 'Trace 4 Hops', desc: 'Follow temporal money movement layer by layer' },
    { num: '04', title: 'Track Lineage', desc: 'Trace splits & preserve attributable volume' },
    { num: '05', title: 'Detect Candidates', desc: 'Classify L1 collector, L2 distributor, L3 cashout' },
    { num: '06', title: 'Analyze Risk', desc: 'Compute explainable risk scores with audit weights' },
    { num: '07', title: 'Generate Evidence', desc: 'Draft court-ready case diaries & freeze requisitions' },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-[#fafafc] border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold tracking-wider uppercase mb-4 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>HOW IT WORKS</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight leading-tight mb-4 font-heading">
            From Transactions to <br />
            <span className="text-zinc-600 font-bold">Actionable Evidence</span>
          </h2>

          <p className="text-base text-zinc-600 leading-relaxed">
            ANVITRACE turns complex transaction data into a clear investigation trail with explainable insights and evidence linked to every finding.
          </p>
        </div>

        {/* 3 Step Workflow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-16">
          {steps.map((step, idx) => (
            <div
              key={step.num}
              className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm flex flex-col justify-between relative group hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-zinc-950 text-white flex items-center justify-center font-bold text-xs">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 font-heading">{step.title}</h3>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 leading-relaxed mb-6">
                  {step.desc}
                </p>
              </div>

              {/* Embedded Visual */}
              <div className="mt-auto">
                {step.cardContent}
              </div>

              {/* Connecting arrow indicator for desktop */}
              {idx < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-zinc-200 text-zinc-400 items-center justify-center shadow-xs z-10">
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 7-Step Forensic Pipeline Strip */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-950 font-heading">
              End-to-End Investigation Architecture
            </span>
            <span className="text-[11px] font-semibold text-amber-700">
              Deterministic • No Hallucination
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {pipeline.map((p) => (
              <div
                key={p.num}
                className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/70 flex flex-col justify-between text-left hover:bg-zinc-100/60 hover:border-zinc-300 transition-colors"
              >
                <div>
                  <div className="text-[10px] font-mono font-bold text-amber-700 mb-1">
                    {p.num}
                  </div>
                  <div className="text-xs font-bold text-zinc-900 leading-tight mb-1 font-heading">
                    {p.title}
                  </div>
                </div>
                <div className="text-[10px] text-zinc-500 leading-tight mt-2">
                  {p.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
