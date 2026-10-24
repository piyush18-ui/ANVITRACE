import React from 'react';
import { ArrowRight, AlertTriangle, CheckCircle2, Layers, Cpu, ShieldCheck, Database, GitBranch } from 'lucide-react';

export const ProblemSolutionSection: React.FC = () => {
  return (
    <section className="py-20 bg-white border-b border-zinc-200 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold tracking-wider uppercase mb-4 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>THE CHALLENGE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight leading-tight mb-4 font-heading">
            Millions of transactions. <br />
            <span className="text-zinc-600 font-bold">One hidden money trail.</span>
          </h2>

          <p className="text-base text-zinc-600 leading-relaxed">
            Manual investigation makes it difficult to follow funds across multiple accounts, time windows and transaction records. ANVITRACE transforms chaotic financial data into a deterministic, multi-hop evidence trail.
          </p>
        </div>

        {/* Visual Transformation: Left (Raw Data) vs Right (ANVITRACE Traced Trail) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* LEFT: Raw Transaction Data */}
          <div className="lg:col-span-5 bg-zinc-50 rounded-xl border border-zinc-200 p-5 shadow-xs relative">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="text-xs font-bold text-zinc-800 uppercase tracking-tight">
                  Raw Transaction Data
                </span>
              </div>
              <span className="text-[10px] font-mono bg-zinc-200/80 text-zinc-700 px-2 py-0.5 rounded">
                2,481,920 Rows
              </span>
            </div>

            <div className="space-y-2 font-mono text-[10px] text-zinc-600 select-none">
              <div className="p-2.5 bg-white rounded-lg border border-zinc-200 text-zinc-500">
                <div className="flex justify-between text-zinc-400 text-[9px] uppercase font-sans font-semibold mb-1">
                  <span>TXN HASH</span>
                  <span>TIME</span>
                  <span>AMOUNT</span>
                </div>
                <div className="flex justify-between truncate">
                  <span>0x8849...912a</span>
                  <span>14:02:11</span>
                  <span className="font-bold text-zinc-800">₹45,000.00</span>
                </div>
                <div className="flex justify-between truncate mt-1">
                  <span>0x310f...44bc</span>
                  <span>14:03:45</span>
                  <span className="font-bold text-zinc-800">₹1,20,000.00</span>
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-zinc-200 text-zinc-500 opacity-80">
                <div className="flex justify-between truncate">
                  <span>0x77aa...21ee</span>
                  <span>14:05:02</span>
                  <span className="font-bold text-zinc-800">₹85,000.00</span>
                </div>
                <div className="flex justify-between truncate mt-1">
                  <span>0x904b...ff02</span>
                  <span>14:09:18</span>
                  <span className="font-bold text-zinc-800">₹2,30,000.00</span>
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-zinc-200 text-zinc-500 opacity-60">
                <div className="flex justify-between truncate">
                  <span>0x12c4...7790</span>
                  <span>14:11:30</span>
                  <span className="font-bold text-zinc-800">₹90,000.00</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-200 flex items-center justify-between text-xs text-rose-600">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Unindexed • Split Over 4,200 Counterparties</span>
              </div>
            </div>
          </div>

          {/* CENTER: Visual Transformation Engine Pillar */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center my-4 lg:my-0">
            <div className="w-11 h-11 rounded-xl bg-white border border-zinc-200 p-1 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
              <img src="/anvitrace-icon.png" alt="ANVITRACE" className="w-full h-full object-contain" />
            </div>
            <div className="text-[11px] font-bold text-zinc-950 mt-2 text-center uppercase tracking-tight">
              ANVITRACE
            </div>
            <div className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider text-center">
              4-Hop Graph Engine
            </div>
            <div className="hidden lg:flex flex-col items-center mt-2">
              <ArrowRight className="w-4 h-4 text-zinc-400" />
            </div>
          </div>

          {/* RIGHT: ANVITRACE Structured Investigation */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-zinc-200 p-5 shadow-xs relative">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <img src="/anvitrace-icon.png" alt="ANVITRACE" className="w-4 h-4 rounded object-contain shrink-0 shadow-2xs" />
                <span className="text-xs font-bold text-zinc-950 uppercase tracking-tight">
                  ANVITRACE Investigation
                </span>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                88.3% Attributed Trail
              </span>
            </div>

            {/* Structured Multi-Layer Flow */}
            <div className="space-y-2.5 text-xs">
              
              {/* Victim Layer */}
              <div className="p-2.5 bg-zinc-50/70 rounded-lg border border-zinc-200 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-bold text-[10px]">
                    VIC
                  </div>
                  <div>
                    <div className="font-mono font-bold text-zinc-950 text-xs">7842 91XX 23XX</div>
                    <div className="text-[10px] text-zinc-500">Primary Victim Account</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-rose-600 font-mono">₹12,48,320</div>
                  <div className="text-[9px] text-zinc-400">14:00 IST</div>
                </div>
              </div>

              {/* Hop 1: Layer 1 Collector */}
              <div className="p-2.5 bg-zinc-50/70 rounded-lg border border-zinc-200 shadow-2xs flex items-center justify-between ml-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center font-bold text-[10px]">
                    L1
                  </div>
                  <div>
                    <div className="font-mono font-bold text-zinc-950 text-xs">9104 22XX 12XX</div>
                    <div className="text-[10px] text-zinc-600 font-medium">Layer 1 Collector Mule</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-zinc-900 font-mono">₹7,20,000</div>
                  <div className="text-[9px] text-zinc-400">&lt; 14m delta</div>
                </div>
              </div>

              {/* Hop 2: Layer 2 Distributor */}
              <div className="p-2.5 bg-zinc-50/70 rounded-lg border border-zinc-200 shadow-2xs flex items-center justify-between ml-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200 flex items-center justify-center font-bold text-[10px]">
                    L2
                  </div>
                  <div>
                    <div className="font-mono font-bold text-zinc-950 text-xs">8123 4XX 97XX</div>
                    <div className="text-[10px] text-zinc-600 font-medium">Layer 2 Fan-out Node</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-zinc-900 font-mono">₹5,90,000</div>
                  <div className="text-[9px] text-rose-600 font-semibold">Risk: 82/100</div>
                </div>
              </div>

              {/* Hop 3: Layer 3 Cashout / Terminals */}
              <div className="p-2.5 bg-zinc-50/70 rounded-lg border border-zinc-200 shadow-2xs flex items-center justify-between ml-9">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-[10px]">
                    L3
                  </div>
                  <div>
                    <div className="font-mono font-bold text-zinc-950 text-xs">ATM-BLR-09 + Crypto</div>
                    <div className="text-[10px] text-zinc-600 font-medium">Identified Terminal Exits</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-700 font-mono">₹4,82,500 Freeze Target</div>
                  <div className="text-[9px] text-emerald-700 font-medium">Ready for Freeze</div>
                </div>
              </div>

            </div>

            <div className="mt-4 pt-3 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-700">
              <div className="flex items-center gap-1.5 font-medium text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Lineage Preserved • No Double-Counting</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Compact Capability Strip */}
        <div className="mt-12 py-3.5 px-6 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-wrap items-center justify-around gap-4 text-xs font-medium text-zinc-700">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Temporal Analysis</span>
          </div>
          <div className="hidden sm:inline text-slate-300">•</div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>4-Hop Money Tracing</span>
          </div>
          <div className="hidden sm:inline text-slate-300">•</div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Evidence-Linked Records</span>
          </div>
          <div className="hidden sm:inline text-slate-300">•</div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>100% Offline Core</span>
          </div>
        </div>

      </div>
    </section>
  );
};
