import React from 'react';
import { 
  GitBranch, 
  ShieldCheck, 
  Network, 
  Smartphone, 
  Wifi, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Layers,
  Zap,
  Activity
} from 'lucide-react';

export const IntelligenceSection: React.FC = () => {
  return (
    <section id="intelligence" className="py-20 bg-white border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold tracking-wider uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>INVESTIGATION INTELLIGENCE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight leading-tight mb-4">
            Forensic Precision at <br />
            <span className="underline decoration-amber-500 decoration-2 underline-offset-4">Every Layer</span>
          </h2>

          <p className="text-base text-zinc-600 leading-relaxed">
            Three core forensic pillars engineered to eliminate false positives, preserve evidence custody, and uncover coordinated financial crime syndicates.
          </p>
        </div>

        {/* 3 Pillars Grid: Money Lineage, Risk Analysis, Cross-Victim Linking */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Pillar A: MONEY LINEAGE */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm flex flex-col justify-between hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                  A. Money Lineage
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Strict Conservation
                </span>
              </div>

              <h3 className="text-lg font-bold text-zinc-950 mb-2">
                Conservation &amp; Split Tracking
              </h3>
              <p className="text-xs text-zinc-600 mb-6 leading-relaxed">
                Track how funds move without double counting. Preserves mathematical lineage across splits and multi-account convergences.
              </p>

              {/* Visual Component: Split & Convergence Flow */}
              <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 space-y-3 font-mono text-xs">
                {/* Initial Fund */}
                <div className="p-2 bg-white rounded-lg border border-zinc-200 flex items-center justify-between">
                  <span className="text-zinc-500 font-sans font-semibold text-[11px]">Primary Inflow</span>
                  <span className="font-bold text-zinc-950">₹1,00,000.00</span>
                </div>

                {/* Split */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2 bg-white rounded-lg border border-zinc-200">
                    <div className="text-amber-700 font-sans font-medium">Split 60%</div>
                    <div className="font-bold text-zinc-950 mt-0.5">₹60,000</div>
                    <div className="text-[8px] text-zinc-400 mt-0.5">Account A-102</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-zinc-200">
                    <div className="text-zinc-700 font-sans font-medium">Split 40%</div>
                    <div className="font-bold text-zinc-950 mt-0.5">₹40,000</div>
                    <div className="text-[8px] text-zinc-400 mt-0.5">Account B-409</div>
                  </div>
                </div>

                {/* Convergence */}
                <div className="p-2 bg-emerald-50/70 rounded-lg border border-emerald-200/60 flex items-center justify-between">
                  <div>
                    <div className="text-emerald-900 font-sans font-bold text-[10px]">Downstream Convergence</div>
                    <div className="text-[8px] text-emerald-700">Unified Mule Target</div>
                  </div>
                  <span className="font-bold text-emerald-700">₹94,500 <span className="text-[8px] text-zinc-400">(-fee)</span></span>
                </div>
              </div>
            </div>

            {/* Status Breakdown Pills */}
            <div className="mt-6 pt-4 border-t border-zinc-100 grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="p-1.5 bg-emerald-50 rounded border border-emerald-200/60">
                <div className="font-bold text-emerald-700">TRACED</div>
                <div className="text-zinc-700 font-mono">88.3%</div>
              </div>
              <div className="p-1.5 bg-amber-50 rounded border border-amber-200/60">
                <div className="font-bold text-amber-800">ATTRIBUTED</div>
                <div className="text-zinc-700 font-mono">₹11.02L</div>
              </div>
              <div className="p-1.5 bg-zinc-100 rounded border border-zinc-200">
                <div className="font-bold text-zinc-700">UNRESOLVED</div>
                <div className="text-zinc-700 font-mono">11.7%</div>
              </div>
            </div>
          </div>

          {/* Pillar B: RISK ANALYSIS */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm flex flex-col justify-between hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                  B. Explainable Risk
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60">
                  Weighted Scoring
                </span>
              </div>

              <h3 className="text-lg font-bold text-zinc-950 mb-2">
                Multi-Signal Mule Classification
              </h3>
              <p className="text-xs text-zinc-600 mb-6 leading-relaxed">
                Clear reasoning for every score. Classifies accounts by behavioural signals without black-box hallucination.
              </p>

              {/* Visual Component: Risk Breakdown Card */}
              <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                  <span className="font-bold text-zinc-800">Target Mule Risk</span>
                  <div className="flex items-center gap-1.5 font-bold text-rose-600 font-mono">
                    <span className="text-base">82</span>
                    <span className="text-[10px] text-zinc-400">/ 100</span>
                  </div>
                </div>

                {/* Candidate Role Indicators */}
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex items-center justify-between p-1.5 bg-white rounded border border-zinc-200">
                    <span className="font-semibold text-zinc-800">L1 Collector Candidate</span>
                    <span className="font-mono text-amber-700 font-bold">14 Counterparties</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-white rounded border border-zinc-200">
                    <span className="font-semibold text-zinc-800">L2 Distributor Candidate</span>
                    <span className="font-mono text-zinc-900 font-bold">86.1% Velocity</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-white rounded border border-zinc-200">
                    <span className="font-semibold text-zinc-800">L3 Terminal Candidate</span>
                    <span className="font-mono text-emerald-700 font-bold">ATM Cashout</span>
                  </div>
                </div>

                {/* Signals Bar Progress */}
                <div className="pt-2 border-t border-zinc-200 space-y-1 text-[9px] text-zinc-500 font-semibold uppercase">
                  <div className="flex justify-between">
                    <span>Pass-through velocity</span>
                    <span className="text-zinc-900 font-bold">94%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fan-in / Fan-out imbalance</span>
                    <span className="text-zinc-900 font-bold">88%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Device &amp; IP subnet overlap</span>
                    <span className="text-zinc-900 font-bold">79%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Proof Tag */}
            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-600">
              <span className="font-medium">Rule Engine:</span>
              <span className="font-mono text-zinc-900 font-bold">7 Deterministic Heuristics</span>
            </div>
          </div>

          {/* Pillar C: CROSS-VICTIM LINKING */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm flex flex-col justify-between hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                  C. Cross-Victim Linking
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                  Syndicate Unmasking
                </span>
              </div>

              <h3 className="text-lg font-bold text-zinc-950 mb-2">
                Multi-FIR Infrastructure Convergence
              </h3>
              <p className="text-xs text-zinc-600 mb-6 leading-relaxed">
                Connect disparate complaints to the same criminal syndicate by identifying shared beneficiary accounts, devices, and IPs.
              </p>

              {/* Visual Component: Convergence Tree */}
              <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 space-y-2 text-xs">
                {/* 3 Victims */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  <div className="p-1.5 bg-white rounded border border-rose-200 text-rose-700 font-bold">
                    Victim A
                    <div className="text-[8px] text-zinc-400 font-normal">FIR #102</div>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-rose-200 text-rose-700 font-bold">
                    Victim B
                    <div className="text-[8px] text-zinc-400 font-normal">FIR #241</div>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-rose-200 text-rose-700 font-bold">
                    Victim C
                    <div className="text-[8px] text-zinc-400 font-normal">FIR #388</div>
                  </div>
                </div>

                {/* Common Mule Account Node */}
                <div className="p-2.5 bg-white rounded-lg border-2 border-zinc-900 text-center shadow-xs">
                  <div className="text-[9px] font-bold uppercase text-amber-700 tracking-wider">
                    Common Target Account
                  </div>
                  <div className="font-mono font-bold text-zinc-950 text-xs mt-0.5">
                    4410 88XX 1920
                  </div>
                  <div className="text-[9px] text-zinc-500">
                    Aggregated Inflow: ₹34,50,000 from 3 distinct victims
                  </div>
                </div>

                {/* Shared Device & IP Fingerprint */}
                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                  <div className="p-1.5 bg-white rounded border border-zinc-200 flex items-center gap-1.5 text-zinc-700">
                    <Smartphone className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
                    <span className="truncate">IMEI Match: 8642...910</span>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-zinc-200 flex items-center gap-1.5 text-zinc-700">
                    <Wifi className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
                    <span className="truncate">IP Subnet: 114.143.XX</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Proof Tag */}
            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-600">
              <span className="font-medium">Syndicate Level:</span>
              <span className="font-bold text-zinc-900">High Confidence Coordinated</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
