import React, { useState } from 'react';
import { 
  Search, 
  ShieldAlert, 
  GitBranch,
  Layers, 
  FileCheck, 
  Database, 
  Fingerprint, 
  ArrowRight,
  TrendingDown,
  Info,
  Maximize2,
  CheckCircle2
} from 'lucide-react';

interface ProductShowcaseSectionProps {
  onLaunchInvestigation: () => void;
}

export const ProductShowcaseSection: React.FC<ProductShowcaseSectionProps> = ({ onLaunchInvestigation }) => {
  const [activeCallout, setActiveCallout] = useState<string>('graph');

  return (
    <section id="product" className="py-24 bg-[#fafafc] border-b border-zinc-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold tracking-wider uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>PRODUCT SHOWCASE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight leading-tight mb-4">
            See the Money Trail, <br />
            <span className="underline decoration-amber-500 decoration-2 underline-offset-4">Not Just the Numbers.</span>
          </h2>

          <p className="text-base text-zinc-600 leading-relaxed">
            An interactive investigation workspace to trace, analyze and build evidence from complex transaction networks in real-time.
          </p>

          {/* Interactive Callout Selector Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {[
              { id: 'graph', label: 'Interactive Graph' },
              { id: 'profile', label: 'Account Profiling' },
              { id: 'timeline', label: 'Transaction Timeline' },
              { id: 'evidence', label: 'Evidence & Insights' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCallout(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeCallout === tab.id
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Large Realistic Full-Scale Dashboard Application Window */}
        <div className="relative rounded-2xl border border-zinc-200 shadow-md bg-white overflow-hidden">
          
          {/* Top Window Bar */}
          <div className="bg-[#090d16] text-white px-5 py-3.5 flex items-center justify-between border-b border-zinc-800">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              </div>
              <div className="h-4 w-[1px] bg-zinc-800" />
              <div className="flex items-center gap-2 font-extrabold text-sm tracking-tight text-white uppercase">
                <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                <span>ANVITRACE INVESTIGATION WORKSPACE</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300">
                <Search className="w-3.5 h-3.5 text-zinc-400" />
                <span>Case #2026-IND-017 • Target Account 7842 91XX 23XX</span>
              </div>
              <button
                onClick={onLaunchInvestigation}
                className="hidden sm:inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                <span>Launch App</span>
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Full Application Grid: Sidebar + Center Graph + Right Inspector */}
          <div className="grid grid-cols-12 min-h-[520px]">
            
            {/* Left Mock Sidebar (2 cols) */}
            <div className="hidden lg:flex col-span-2 bg-zinc-50 border-r border-zinc-200 p-4 flex-col justify-between text-xs">
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 px-2">
                  Navigation
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-100 text-zinc-950 font-bold border-l-2 border-amber-500">
                  <GitBranch className="w-4 h-4 text-zinc-900" />
                  <span>Graph View</span>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 transition-colors">
                  <Database className="w-4 h-4 text-zinc-400" />
                  <span>Raw Dataset</span>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 transition-colors">
                  <ShieldAlert className="w-4 h-4 text-zinc-400" />
                  <span>Mule Queue</span>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 transition-colors">
                  <Fingerprint className="w-4 h-4 text-zinc-400" />
                  <span>Evidence Hub</span>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 transition-colors">
                  <FileCheck className="w-4 h-4 text-zinc-400" />
                  <span>Case Diary</span>
                </div>
              </div>

              {/* Offline indicator */}
              <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-2xs">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>DuckDB Offline</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">2.4M rows indexed</div>
              </div>
            </div>

            {/* Center: 4-Hop Transaction Network Graph & Timeline (7 cols) */}
            <div className="col-span-12 lg:col-span-7 p-6 bg-white flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-200 relative">
              
              {/* Callout Indicator for Interactive Graph */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-zinc-950">4-Hop Multi-Layer Money Trail</h4>
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 text-[10px] font-bold rounded border border-zinc-200">
                      Attributed Path
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Temporal window: 2026-09-15 14:00 to 2026-09-20 18:30 (15 days analysis)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400">Scale: 100%</span>
                </div>
              </div>

              {/* Large SVG Network Canvas */}
              <div className="relative w-full h-[280px] bg-zinc-50/70 rounded-xl border border-zinc-200 p-4 flex items-center justify-center overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 600 240">
                  {/* Connecting Paths with Solid Forensic Strokes */}
                  <path d="M 70 120 C 130 120, 140 60, 200 60" stroke="#a1a1aa" strokeWidth="2.5" fill="none" strokeDasharray="4 3" />
                  <path d="M 70 120 C 130 120, 140 180, 200 180" stroke="#a1a1aa" strokeWidth="2.5" fill="none" strokeDasharray="4 3" />

                  <path d="M 200 60 C 260 60, 270 40, 330 40" stroke="#71717a" strokeWidth="2" fill="none" />
                  <path d="M 200 60 C 260 60, 270 120, 330 120" stroke="#71717a" strokeWidth="2" fill="none" />
                  <path d="M 200 180 C 260 180, 270 120, 330 120" stroke="#71717a" strokeWidth="2" fill="none" />
                  <path d="M 200 180 C 260 180, 270 200, 330 200" stroke="#71717a" strokeWidth="2" fill="none" />

                  <path d="M 330 40 C 400 40, 410 30, 480 30" stroke="#059669" strokeWidth="2" fill="none" strokeDasharray="3 2" />
                  <path d="M 330 120 C 400 120, 420 100, 480 100" stroke="#059669" strokeWidth="2.5" fill="none" strokeDasharray="3 2" />
                  <path d="M 330 120 C 400 120, 420 150, 480 150" stroke="#059669" strokeWidth="2" fill="none" strokeDasharray="3 2" />
                  <path d="M 330 200 C 400 200, 420 210, 480 210" stroke="#059669" strokeWidth="2" fill="none" strokeDasharray="3 2" />

                  {/* Flow Amount Indicators */}
                  <rect x="110" y="70" width="60" height="16" rx="3" fill="#ffffff" stroke="#e4e4e7" />
                  <text x="140" y="81" textAnchor="middle" fill="#18181b" fontSize="8" fontWeight="bold" fontFamily="monospace">₹7,20,000</text>

                  <rect x="110" y="155" width="60" height="16" rx="3" fill="#ffffff" stroke="#e4e4e7" />
                  <text x="140" y="166" textAnchor="middle" fill="#18181b" fontSize="8" fontWeight="bold" fontFamily="monospace">₹5,28,320</text>

                  {/* Nodes with Labels */}
                  {/* Victim Node */}
                  <g transform="translate(70, 120)">
                    <circle r="20" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" />
                    <circle r="13" fill="#ef4444" />
                    <text y="4" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">VIC</text>
                    <text y="32" textAnchor="middle" fill="#090a0c" fontSize="9" fontWeight="bold">Victim Account</text>
                    <text y="42" textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="bold">₹12,48,320</text>
                  </g>

                  {/* L1 Nodes (Amber Mules) */}
                  <g transform="translate(200, 60)">
                    <circle r="16" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                    <circle r="10" fill="#d97706" />
                    <text y="3" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">L1</text>
                    <text y="26" textAnchor="middle" fill="#18181b" fontSize="8" fontWeight="600">Collector-A</text>
                  </g>

                  <g transform="translate(200, 180)">
                    <circle r="16" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                    <circle r="10" fill="#d97706" />
                    <text y="3" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">L1</text>
                    <text y="26" textAnchor="middle" fill="#18181b" fontSize="8" fontWeight="600">Collector-B</text>
                  </g>

                  {/* L2 Nodes (Charcoal with Target Highlight) */}
                  <g transform="translate(330, 40)">
                    <circle r="14" fill="#f4f4f5" stroke="#52525b" strokeWidth="1.5" />
                    <circle r="9" fill="#27272a" />
                    <text y="3" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">L2</text>
                  </g>

                  <g transform="translate(330, 120)">
                    <circle r="21" fill="#fef3c7" stroke="#d97706" strokeWidth="2.5" />
                    <circle r="13" fill="#18181b" />
                    <text y="4" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">L2</text>
                    <text y="32" textAnchor="middle" fill="#090a0c" fontSize="9" fontWeight="bold">8123 4XX 97XX</text>
                    <text y="42" textAnchor="middle" fill="#dc2626" fontSize="8" fontWeight="bold">Risk 82</text>
                  </g>

                  <g transform="translate(330, 200)">
                    <circle r="14" fill="#f4f4f5" stroke="#52525b" strokeWidth="1.5" />
                    <circle r="9" fill="#27272a" />
                    <text y="3" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">L2</text>
                  </g>

                  {/* L3 Cashouts (Muted Green) */}
                  <g transform="translate(480, 30)">
                    <circle r="13" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
                    <circle r="8" fill="#059669" />
                    <text y="3" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">L3</text>
                    <text y="22" textAnchor="middle" fill="#047857" fontSize="8" fontWeight="600">ATM Cluster</text>
                  </g>

                  <g transform="translate(480, 100)">
                    <circle r="15" fill="#ecfdf5" stroke="#059669" strokeWidth="2" />
                    <circle r="9" fill="#059669" />
                    <text y="3" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">L3</text>
                    <text y="24" textAnchor="middle" fill="#047857" fontSize="8" fontWeight="bold">Crypto Gateway</text>
                  </g>

                  <g transform="translate(480, 150)">
                    <circle r="13" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
                    <circle r="8" fill="#059669" />
                    <text y="3" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">L3</text>
                    <text y="22" textAnchor="middle" fill="#047857" fontSize="8" fontWeight="600">Merchant POS</text>
                  </g>

                  <g transform="translate(480, 210)">
                    <circle r="13" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
                    <circle r="8" fill="#059669" />
                    <text y="3" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">L3</text>
                    <text y="22" textAnchor="middle" fill="#047857" fontSize="8" fontWeight="600">Mule Wallet</text>
                  </g>
                </svg>

                {/* Subtle Callout Tag */}
                <div className="absolute top-3 right-3 bg-white border border-zinc-200 rounded-lg p-2 shadow-xs text-[10px]">
                  <span className="font-bold text-zinc-900">Graph Intelligence:</span>
                  <div className="text-zinc-500">L1 Collector → L2 Fan-out → L3 Terminal</div>
                </div>
              </div>

              {/* Bottom Transaction Timeline Section */}
              <div className="mt-4 pt-3 border-t border-zinc-200">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900">15-Day Transaction Velocity Timeline</span>
                    <span className="text-[10px] text-zinc-400 font-mono">(Inflow vs Outflow)</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1 text-zinc-600">
                      <span className="w-2.5 h-2.5 rounded-xs bg-zinc-900" /> Inflow
                    </span>
                    <span className="flex items-center gap-1 text-zinc-600">
                      <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> Outflow
                    </span>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-1.5 h-14 bg-zinc-50 rounded-lg p-2 border border-zinc-200/80">
                  {[
                    { day: 'Sep 15', in: 40, out: 20 },
                    { day: 'Sep 16', in: 25, out: 15 },
                    { day: 'Sep 17', in: 85, out: 75 },
                    { day: 'Sep 18', in: 95, out: 90 },
                    { day: 'Sep 19', in: 50, out: 45 },
                    { day: 'Sep 20', in: 30, out: 35 },
                    { day: 'Sep 21', in: 60, out: 55 },
                    { day: 'Sep 22', in: 70, out: 80 },
                    { day: 'Sep 23', in: 20, out: 25 },
                    { day: 'Sep 24', in: 45, out: 40 },
                    { day: 'Sep 25', in: 90, out: 85 },
                  ].map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                      <div className="flex gap-[1px] items-end w-full justify-center h-full">
                        <div className="w-1.5 bg-zinc-900 rounded-t-[1px]" style={{ height: `${d.in}%` }} />
                        <div className="w-1.5 bg-amber-500 rounded-t-[1px]" style={{ height: `${d.out}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right: Selected Account Inspector & Risk Details (3 cols) */}
            <div className="col-span-12 lg:col-span-3 p-5 bg-zinc-50 flex flex-col justify-between text-xs">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Selected Target Node
                </div>
                <div className="font-mono text-sm font-bold text-zinc-950">
                  8123 4XX 97XX
                </div>
                <div className="text-[11px] text-zinc-500">
                  Layer 2 Distributor • HDFC Bank
                </div>

                {/* Risk Gauge Card */}
                <div className="mt-4 p-3.5 bg-white rounded-xl border border-zinc-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-zinc-400">Mule Risk Index</div>
                      <div className="text-2xl font-extrabold text-rose-600 mt-0.5">82 / 100</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-bold text-xs">
                      HIGH
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-zinc-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>Candidate L2 Mule (Distributor)</span>
                  </div>
                </div>

                {/* Quantitative Details */}
                <div className="mt-4 space-y-2 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-zinc-200/80">
                    <span className="text-zinc-500">Total Inflow</span>
                    <span className="font-bold text-zinc-950 font-mono">₹9,12,000</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/80">
                    <span className="text-zinc-500">Total Outflow</span>
                    <span className="font-bold text-zinc-950 font-mono">₹7,85,000</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/80">
                    <span className="text-zinc-500">Pass-Through Velocity</span>
                    <span className="font-bold text-amber-700">86.1% in &lt; 2h</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/80">
                    <span className="text-zinc-500">Fan-Out Ratio</span>
                    <span className="font-bold text-rose-700">1-to-4 (14 Peers)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Recovery Potential</span>
                    <span className="font-bold text-emerald-700 font-mono">₹4,82,500</span>
                  </div>
                </div>

                {/* Recent Transactions List */}
                <div className="mt-4 pt-3 border-t border-zinc-200">
                  <div className="text-[10px] font-bold uppercase text-zinc-400 mb-2">
                    Recent Traced Hops
                  </div>
                  <div className="space-y-1.5 text-[10px] font-mono">
                    <div className="p-1.5 bg-white rounded border border-zinc-200 flex justify-between">
                      <span className="text-zinc-700">₹1,30,000 UPI</span>
                      <span className="text-emerald-700 font-bold">Traced</span>
                    </div>
                    <div className="p-1.5 bg-white rounded border border-zinc-200 flex justify-between">
                      <span className="text-zinc-700">₹2,50,000 NEFT</span>
                      <span className="text-emerald-700 font-bold">Traced</span>
                    </div>
                    <div className="p-1.5 bg-white rounded border border-zinc-200 flex justify-between">
                      <span className="text-zinc-700">₹75,500 IMPS</span>
                      <span className="text-emerald-700 font-bold">Traced</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5">
                <button
                  onClick={onLaunchInvestigation}
                  className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <span>Open Full Investigation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

          </div>

          {/* Bottom Security / Integrity Bar */}
          <div className="bg-[#090d16] text-white px-5 py-2.5 flex items-center justify-between text-xs border-t border-zinc-800">
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>SHA-256 Chain of Custody Verified</span>
              </span>
              <span className="text-zinc-600 hidden sm:inline">|</span>
              <span className="text-zinc-300 font-mono hidden sm:inline">
                Hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </span>
            </div>

            <div className="text-[10px] text-zinc-400 font-medium">
              Air-Gapped Forensic State
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
