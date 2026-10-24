import React from 'react';
import { 
  GitBranch, 
  ShieldAlert, 
  BarChart3, 
  CalendarRange, 
  Network, 
  FileText, 
  ArrowRight, 
  Zap, 
  Users, 
  Share2, 
  Link2,
  FileCheck
} from 'lucide-react';

interface CapabilityGridProps {
  onLaunchInvestigation: () => void;
}

export const CapabilityGrid: React.FC<CapabilityGridProps> = ({ onLaunchInvestigation }) => {
  return (
    <section id="capabilities" className="py-20 bg-white border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold tracking-wider uppercase mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>CORE CAPABILITIES</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight leading-tight">
              Everything You Need to <br />
              Investigate <span className="underline decoration-amber-500 decoration-2 underline-offset-4">Financial Crimes</span>
            </h2>

            <p className="text-base text-zinc-600 leading-relaxed mt-3">
              From raw transactions to evidence ready reports, ANVITRACE brings all the tools into one integrated platform.
            </p>
          </div>

          <div>
            <button
              onClick={onLaunchInvestigation}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 bg-white text-xs font-semibold text-zinc-800 shadow-xs transition-all cursor-pointer"
            >
              <span>Explore All Features</span>
              <ArrowRight className="w-4 h-4 text-zinc-600" />
            </button>
          </div>
        </div>

        {/* 2 x 3 Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Card 01: 4-Hop Money Tracing */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col justify-between hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200/80 flex items-center justify-center mb-4 group-hover:border-amber-500/50 group-hover:text-amber-600 transition-colors">
                <GitBranch className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-950 mb-1">4-Hop Money Tracing</h3>
              <p className="text-xs text-zinc-600 mb-5">
                Follow the money across multiple layers with temporal accuracy.
              </p>
            </div>

            {/* Embedded Visual: Multi-layer Node Lineage */}
            <div className="bg-zinc-50/70 rounded-lg border border-zinc-200/80 p-3 shadow-2xs h-[140px] flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 240 100">
                {/* Edges */}
                <line x1="30" y1="50" x2="80" y2="25" stroke="#a1a1aa" strokeWidth="1.5" strokeDasharray="3 2" />
                <line x1="30" y1="50" x2="80" y2="50" stroke="#a1a1aa" strokeWidth="1.5" />
                <line x1="30" y1="50" x2="80" y2="75" stroke="#a1a1aa" strokeWidth="1.5" strokeDasharray="3 2" />

                <line x1="80" y1="25" x2="140" y2="25" stroke="#d4d4d8" strokeWidth="1.5" />
                <line x1="80" y1="50" x2="140" y2="50" stroke="#d4d4d8" strokeWidth="1.5" />
                <line x1="80" y1="75" x2="140" y2="75" stroke="#d4d4d8" strokeWidth="1.5" />

                <line x1="140" y1="25" x2="200" y2="25" stroke="#059669" strokeWidth="1.5" strokeDasharray="2 2" />
                <line x1="140" y1="50" x2="200" y2="50" stroke="#059669" strokeWidth="1.5" strokeDasharray="2 2" />
                <line x1="140" y1="75" x2="200" y2="75" stroke="#059669" strokeWidth="1.5" strokeDasharray="2 2" />

                {/* Nodes */}
                {/* Victim (Red) */}
                <circle cx="30" cy="50" r="10" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
                <text x="30" y="53" textAnchor="middle" fill="#b91c1c" fontSize="7" fontWeight="bold">VIC</text>
                <text x="30" y="70" textAnchor="middle" fill="#ef4444" fontSize="6" fontWeight="bold">Victim</text>

                {/* Layer 1 (Amber Mule) */}
                <circle cx="80" cy="25" r="8" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                <text x="80" y="28" textAnchor="middle" fill="#b45309" fontSize="6" fontWeight="bold">L1</text>

                <circle cx="80" cy="50" r="8" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                <text x="80" y="53" textAnchor="middle" fill="#b45309" fontSize="6" fontWeight="bold">L1</text>

                <circle cx="80" cy="75" r="8" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                <text x="80" y="78" textAnchor="middle" fill="#b45309" fontSize="6" fontWeight="bold">L1</text>

                {/* Layer 2 (Charcoal) */}
                <circle cx="140" cy="25" r="8" fill="#f4f4f5" stroke="#52525b" strokeWidth="1.5" />
                <text x="140" y="28" textAnchor="middle" fill="#18181b" fontSize="6" fontWeight="bold">L2</text>

                <circle cx="140" cy="50" r="8" fill="#f4f4f5" stroke="#52525b" strokeWidth="1.5" />
                <text x="140" y="53" textAnchor="middle" fill="#18181b" fontSize="6" fontWeight="bold">L2</text>

                <circle cx="140" cy="75" r="8" fill="#f4f4f5" stroke="#52525b" strokeWidth="1.5" />
                <text x="140" y="78" textAnchor="middle" fill="#18181b" fontSize="6" fontWeight="bold">L2</text>

                {/* Layer 3 (Emerald) */}
                <circle cx="200" cy="25" r="8" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
                <text x="200" y="28" textAnchor="middle" fill="#047857" fontSize="6" fontWeight="bold">L3</text>

                <circle cx="200" cy="50" r="8" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
                <text x="200" y="53" textAnchor="middle" fill="#047857" fontSize="6" fontWeight="bold">L3</text>

                <circle cx="200" cy="75" r="8" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
                <text x="200" y="78" textAnchor="middle" fill="#047857" fontSize="6" fontWeight="bold">L3</text>
              </svg>
            </div>
          </div>

          {/* Card 02: Mule Detection */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col justify-between hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200/80 flex items-center justify-center mb-4 group-hover:border-amber-500/50 group-hover:text-amber-600 transition-colors">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-950 mb-1">Mule Detection</h3>
              <p className="text-xs text-zinc-600 mb-5">
                Identify L1, L2 and L3 mule account candidates.
              </p>
            </div>

            {/* Embedded Visual: Clean Account Risk Table */}
            <div className="bg-zinc-50/70 rounded-lg border border-zinc-200/80 p-3 shadow-2xs h-[140px] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-zinc-400 border-b border-zinc-200/80 pb-1.5">
                <span>Account</span>
                <span>Risk Score</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="font-mono text-[11px] text-zinc-900 font-semibold">9123 45XX 67XX</span>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 text-[10px] font-bold rounded">
                    92
                  </span>
                </div>

                <div className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="font-mono text-[11px] text-zinc-900 font-semibold">5566 99XX 11XX</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 text-[10px] font-bold rounded">
                    78
                  </span>
                </div>

                <div className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-400" />
                    <span className="font-mono text-[11px] text-zinc-900 font-semibold">2284 11XX 90XX</span>
                  </div>
                  <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 border border-zinc-200 text-[10px] font-bold rounded">
                    61
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 03: Risk Analysis */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col justify-between hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200/80 flex items-center justify-center mb-4 group-hover:border-amber-500/50 group-hover:text-amber-600 transition-colors">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-950 mb-1">Risk Analysis</h3>
              <p className="text-xs text-zinc-600 mb-5">
                Get explainable risk scores with clear reasoning.
              </p>
            </div>

            {/* Embedded Visual: Risk Gauge & Top Risk Signals */}
            <div className="bg-zinc-50/70 rounded-lg border border-zinc-200/80 p-3 shadow-2xs h-[140px] flex items-center justify-between gap-3">
              {/* Circular Gauge */}
              <div className="flex flex-col items-center justify-center text-center pl-2">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg className="w-14 h-14 transform -rotate-90">
                    <circle cx="28" cy="28" r="22" stroke="#e4e4e7" strokeWidth="4" fill="none" />
                    <circle
                      cx="28"
                      cy="28"
                      r="22"
                      stroke="#ef4444"
                      strokeWidth="4"
                      strokeDasharray="138"
                      strokeDashoffset="25"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-sm font-extrabold text-zinc-950">82</span>
                    <span className="text-[8px] text-zinc-400 font-medium">/100</span>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200/60 rounded px-1.5 py-0.5 mt-1 uppercase">High Risk</span>
              </div>

              {/* Signals List */}
              <div className="space-y-1 text-[10px] text-zinc-600 border-l border-zinc-200/80 pl-3 flex-1">
                <div className="text-[9px] font-bold text-zinc-400 uppercase mb-1">Top Risk Signals</div>
                <div className="flex items-center gap-1.5 truncate">
                  <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>Rapid transfers</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Users className="w-3 h-3 text-zinc-700 shrink-0" />
                  <span>Multiple counterparties</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Share2 className="w-3 h-3 text-zinc-600 shrink-0" />
                  <span>Fan-out pattern</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Link2 className="w-3 h-3 text-rose-600 shrink-0" />
                  <span>Linked to mule cluster</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 04: Transaction Timeline */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col justify-between hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200/80 flex items-center justify-center mb-4 group-hover:border-amber-500/50 group-hover:text-amber-600 transition-colors">
                <CalendarRange className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-950 mb-1">Transaction Timeline</h3>
              <p className="text-xs text-zinc-600 mb-5">
                Analyze inflow and outflow patterns over time.
              </p>
            </div>

            {/* Embedded Visual: Inflow/Outflow Bar Chart with axis */}
            <div className="bg-zinc-50/70 rounded-lg border border-zinc-200/80 p-3 shadow-2xs h-[140px] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-zinc-800">15-Day Velocity</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[9px] text-zinc-600">
                    <span className="w-2 h-2 rounded-xs bg-zinc-900" /> Inflow
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-zinc-600">
                    <span className="w-2 h-2 rounded-xs bg-amber-500" /> Outflow
                  </span>
                </div>
              </div>

              {/* Bar visualization */}
              <div className="relative flex items-end justify-between h-16 pt-2 border-b border-zinc-200/80">
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[8px] text-zinc-400 font-mono">
                  <span>₹3L</span>
                  <span>₹2L</span>
                  <span>₹1L</span>
                </div>

                <div className="flex items-end justify-around w-full pl-6 pr-1 h-full">
                  {[
                    { in: 35, out: 20 },
                    { in: 65, out: 45 },
                    { in: 40, out: 80 },
                    { in: 90, out: 70 },
                    { in: 30, out: 35 },
                    { in: 85, out: 95 },
                    { in: 50, out: 40 },
                  ].map((bar, i) => (
                    <div key={i} className="flex gap-[2px] items-end h-full">
                      <div className="w-2 bg-zinc-900 rounded-t-[1px]" style={{ height: `${bar.in}%` }} />
                      <div className="w-2 bg-amber-500 rounded-t-[1px]" style={{ height: `${bar.out}%` }} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between text-[8px] font-mono text-zinc-400 pl-6 pr-1">
                <span>Sep 15</span>
                <span>Sep 19</span>
                <span>Sep 23</span>
                <span>Sep 27</span>
              </div>
            </div>
          </div>

          {/* Card 05: Network Graph */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col justify-between hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200/80 flex items-center justify-center mb-4 group-hover:border-amber-500/50 group-hover:text-amber-600 transition-colors">
                <Network className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-950 mb-1">Network Graph</h3>
              <p className="text-xs text-zinc-600 mb-5">
                Visualize the complete transaction network with interactive graphs.
              </p>
            </div>

            {/* Embedded Visual: Network Graph with 4 Hops Chip */}
            <div className="bg-zinc-50/70 rounded-lg border border-zinc-200/80 p-2 shadow-2xs h-[140px] relative overflow-hidden flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 200 100">
                <line x1="30" y1="50" x2="70" y2="30" stroke="#a1a1aa" strokeWidth="1.5" />
                <line x1="30" y1="50" x2="70" y2="70" stroke="#a1a1aa" strokeWidth="1.5" />
                <line x1="70" y1="30" x2="120" y2="40" stroke="#d4d4d8" strokeWidth="1.5" />
                <line x1="70" y1="70" x2="120" y2="40" stroke="#d4d4d8" strokeWidth="1.5" />
                <line x1="120" y1="40" x2="170" y2="25" stroke="#a1a1aa" strokeWidth="1.5" strokeDasharray="2 2" />
                <line x1="120" y1="40" x2="170" y2="65" stroke="#a1a1aa" strokeWidth="1.5" strokeDasharray="2 2" />

                <circle cx="30" cy="50" r="7" fill="#ef4444" />
                <circle cx="70" cy="30" r="6" fill="#d97706" />
                <circle cx="70" cy="70" r="6" fill="#d97706" />
                <circle cx="120" cy="40" r="8" fill="#27272a" />
                <circle cx="170" cy="25" r="5" fill="#059669" />
                <circle cx="170" cy="65" r="5" fill="#059669" />
              </svg>

              {/* Floating Pill */}
              <div className="absolute bottom-2 right-2 bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-[9px] shadow-xs flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <div>
                  <div className="font-bold text-zinc-900">4 Hops • 27 Accounts</div>
                  <div className="font-mono text-emerald-700 font-semibold">₹11,02,450</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 06: Evidence Reports */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col justify-between hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200/80 flex items-center justify-center mb-4 group-hover:border-amber-500/50 group-hover:text-amber-600 transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-950 mb-1">Evidence Reports</h3>
              <p className="text-xs text-zinc-600 mb-5">
                Generate investigation ready reports with supporting evidence.
              </p>
            </div>

            {/* Embedded Visual: Realistic Case Report Card Preview */}
            <div className="bg-zinc-50/70 rounded-lg border border-zinc-200/80 p-3 shadow-2xs h-[140px] flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200/80">
                <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-zinc-700" />
                  Case Report
                </span>
                <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/60 text-[10px] font-bold">
                  PDF
                </span>
              </div>

              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Case ID</span>
                  <span className="font-mono font-bold text-zinc-900">2026-IND-017</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Generated On</span>
                  <span className="font-mono text-zinc-700">2026-09-20</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Total Accounts</span>
                  <span className="font-bold text-zinc-900">37</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Traced Amount</span>
                  <span className="font-bold text-emerald-700 font-mono">₹11,02,450</span>
                </div>
              </div>

              <button
                onClick={onLaunchInvestigation}
                className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <span>Export PDF Report</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
