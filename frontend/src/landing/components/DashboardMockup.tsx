import React, { useState } from 'react';
import { Search, ShieldAlert, ArrowUpRight, TrendingUp, CheckCircle2, User, ChevronRight, Activity } from 'lucide-react';

export const DashboardMockup: React.FC = () => {
  const [selectedLayer, setSelectedLayer] = useState<string>('all');
  const [hoveredNode, setHoveredNode] = useState<string | null>('L2-A');

  return (
    <div className="relative w-full max-w-2xl lg:max-w-none mx-auto select-none">
      {/* Main Container with subtle shadow and crisp border */}
      <div className="relative bg-white rounded-xl border border-zinc-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
        
        {/* Mockup Header Bar */}
        <div className="bg-[#090d16] text-white px-4 py-2.5 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            </div>
            <div className="h-4 w-[1px] bg-zinc-800 mx-1" />
            <div className="flex items-center gap-1.5 text-xs font-bold tracking-tight text-white uppercase">
              <img src="/anvitrace-icon.png" alt="ANVITRACE" className="w-3.5 h-3.5 rounded object-contain bg-white p-0.5 shadow-2xs" />
              <span>ANVITRACE FORENSIC CONSOLE</span>
            </div>
          </div>

          {/* Mock search input */}
          <div className="hidden sm:flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 text-xs text-zinc-300 w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] text-zinc-400 truncate">Search Account, IFSC, UTR...</span>
          </div>

          {/* Investigator badge */}
          <div className="flex items-center gap-2 text-xs">
            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-300 font-bold">
              IO
            </div>
            <span className="hidden md:inline text-[11px] text-zinc-300 font-medium">Cyber Cell 007</span>
          </div>
        </div>

        {/* Top Case Intelligence Strip */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2.5 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-[10px] font-semibold uppercase text-zinc-500">Victim Account</div>
            <div className="font-mono font-bold text-zinc-900 flex items-center gap-1.5 mt-0.5">
              <span>7842 91XX 23XX</span>
              <span className="px-1.5 py-0.2 bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-bold rounded">
                High Risk
              </span>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase text-zinc-500">Total Disbursed</div>
            <div className="font-bold text-zinc-900 mt-0.5">
              ₹12,48,320 <span className="text-[10px] font-normal text-zinc-500">(67 txns)</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase text-zinc-500">Traced Amount</div>
            <div className="font-bold text-zinc-950 mt-0.5">
              ₹11,02,450 <span className="text-[10px] font-semibold text-emerald-700">(88.3%)</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase text-zinc-500">Analysis Depth</div>
            <div className="font-bold text-zinc-900 mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>4-Hop Temporal Window</span>
            </div>
          </div>
        </div>

        {/* Main Dashboard Workspace (Graph + Inspector) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[340px]">
          
          {/* Left/Center Graph Visualization (8 cols) */}
          <div className="lg:col-span-8 p-4 border-b lg:border-b-0 lg:border-r border-zinc-200 bg-white flex flex-col justify-between relative">
            {/* Graph controls & layer indicators */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900">Transaction Network (4-Hop)</span>
                <span className="text-[10px] bg-zinc-100 text-zinc-700 font-semibold px-2 py-0.5 rounded border border-zinc-200">
                  Live Path
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-600">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Victim
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> L1 Collector
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-zinc-700" /> L2 Distributor
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" /> L3 Cashout
                </span>
              </div>
            </div>

            {/* SVG Interactive Multi-Hop Graph Canvas */}
            <div className="relative w-full h-[220px] bg-zinc-50 rounded-lg border border-zinc-200 p-2 overflow-hidden flex items-center justify-center">
              {/* Subtle background grid pattern */}
              <div 
                className="absolute inset-0 opacity-[0.3]"
                style={{
                  backgroundImage: 'radial-gradient(#a1a1aa 1px, transparent 1px)',
                  backgroundSize: '16px 16px'
                }}
              />

              <svg className="w-full h-full" viewBox="0 0 540 200">
                {/* Connecting edges with solid technical colors */}
                {/* Victim to L1 */}
                <path d="M 60 100 C 100 100, 110 50, 150 50" stroke="#71717a" strokeWidth="2" fill="none" strokeDasharray="4 2" />
                <path d="M 60 100 C 100 100, 110 150, 150 150" stroke="#71717a" strokeWidth="2" fill="none" strokeDasharray="4 2" />

                {/* L1 to L2: Primary Traced Path in Solid Amber */}
                <path d="M 170 50 C 220 50, 230 40, 280 40" stroke="#d97706" strokeWidth="2.5" fill="none" />
                <path d="M 170 50 C 220 50, 230 100, 280 100" stroke="#a1a1aa" strokeWidth="1.5" fill="none" />

                {/* L1 to L2: Secondary branches */}
                <path d="M 170 150 C 220 150, 230 100, 280 100" stroke="#a1a1aa" strokeWidth="1.5" fill="none" />
                <path d="M 170 150 C 220 150, 230 160, 280 160" stroke="#a1a1aa" strokeWidth="1.5" fill="none" />

                {/* L2 to L3: Cashout flow */}
                <path d="M 300 40 C 350 40, 360 30, 420 30" stroke="#d97706" strokeWidth="2" fill="none" />
                <path d="M 300 100 C 350 100, 370 90, 420 90" stroke="#71717a" strokeWidth="2" fill="none" strokeDasharray="3 3" />
                <path d="M 300 100 C 350 100, 370 130, 420 130" stroke="#a1a1aa" strokeWidth="1.5" fill="none" />
                <path d="M 300 160 C 350 160, 380 170, 420 170" stroke="#a1a1aa" strokeWidth="1.5" fill="none" />

                {/* L3 to Terminal exits */}
                <path d="M 440 30 L 490 30" stroke="#059669" strokeWidth="1.5" strokeDasharray="2 2" />
                <path d="M 440 90 L 490 90" stroke="#059669" strokeWidth="1.5" strokeDasharray="2 2" />
                <path d="M 440 130 L 490 130" stroke="#059669" strokeWidth="1.5" strokeDasharray="2 2" />
                <path d="M 440 170 L 490 170" stroke="#059669" strokeWidth="1.5" strokeDasharray="2 2" />

                {/* Node: VICTIM */}
                <g className="cursor-pointer" transform="translate(60, 100)">
                  <circle r="18" fill="#fef2f2" stroke="#ef4444" strokeWidth="1.5" />
                  <circle r="12" fill="#ef4444" />
                  <text y="4" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">VIC</text>
                  <text y="28" textAnchor="middle" fill="#090a0c" fontSize="8" fontWeight="600">7842..23XX</text>
                  <text y="37" textAnchor="middle" fill="#ef4444" fontSize="7" fontWeight="bold">₹12.48L</text>
                </g>

                {/* Layer 1 Nodes (Collector) */}
                <g className="cursor-pointer" transform="translate(160, 50)">
                  <circle r="14" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
                  <circle r="9" fill="#d97706" />
                  <text y="3" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">L1</text>
                  <text y="22" textAnchor="middle" fill="#18181b" fontSize="8" fontWeight="600">9104..12XX</text>
                  <text y="30" textAnchor="middle" fill="#b45309" fontSize="7" fontWeight="bold">₹7.20L</text>
                </g>

                <g className="cursor-pointer" transform="translate(160, 150)">
                  <circle r="14" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
                  <circle r="9" fill="#d97706" />
                  <text y="3" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">L1</text>
                  <text y="22" textAnchor="middle" fill="#18181b" fontSize="8" fontWeight="600">9432..88XX</text>
                  <text y="30" textAnchor="middle" fill="#b45309" fontSize="7" fontWeight="bold">₹5.28L</text>
                </g>

                {/* Layer 2 Nodes (Distributor) */}
                <g 
                  className="cursor-pointer transition-transform hover:scale-105" 
                  transform="translate(290, 40)"
                  onClick={() => setHoveredNode('L2-A')}
                >
                  <circle r="16" fill="#f4f4f5" stroke="#18181b" strokeWidth="1.5" />
                  <circle r="10" fill="#18181b" />
                  <text y="3" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">L2</text>
                  <text y="23" textAnchor="middle" fill="#090a0c" fontSize="8" fontWeight="bold">8123..97XX</text>
                  <text y="32" textAnchor="middle" fill="#dc2626" fontSize="7" fontWeight="bold">Risk 82</text>
                </g>

                <g className="cursor-pointer" transform="translate(290, 100)">
                  <circle r="12" fill="#f4f4f5" stroke="#52525b" strokeWidth="1" />
                  <circle r="8" fill="#52525b" />
                  <text y="3" textAnchor="middle" fill="#ffffff" fontSize="6" fontWeight="bold">L2</text>
                  <text y="21" textAnchor="middle" fill="#71717a" fontSize="7">5566..11XX</text>
                </g>

                <g className="cursor-pointer" transform="translate(290, 160)">
                  <circle r="12" fill="#f4f4f5" stroke="#52525b" strokeWidth="1" />
                  <circle r="8" fill="#52525b" />
                  <text y="3" textAnchor="middle" fill="#ffffff" fontSize="6" fontWeight="bold">L2</text>
                  <text y="21" textAnchor="middle" fill="#71717a" fontSize="7">2284..90XX</text>
                </g>

                {/* Layer 3 Nodes (Cashout / Mule Terminal) */}
                <g className="cursor-pointer" transform="translate(430, 30)">
                  <circle r="11" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5" />
                  <circle r="7" fill="#059669" />
                  <text y="2" textAnchor="middle" fill="#ffffff" fontSize="6" fontWeight="bold">L3</text>
                  <text y="18" textAnchor="middle" fill="#047857" fontSize="7">ATM-BLR</text>
                </g>

                <g className="cursor-pointer" transform="translate(430, 90)">
                  <circle r="11" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5" />
                  <circle r="7" fill="#059669" />
                  <text y="2" textAnchor="middle" fill="#ffffff" fontSize="6" fontWeight="bold">L3</text>
                  <text y="18" textAnchor="middle" fill="#047857" fontSize="7">P2P-Exch</text>
                </g>

                <g className="cursor-pointer" transform="translate(430, 130)">
                  <circle r="11" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5" />
                  <circle r="7" fill="#059669" />
                  <text y="2" textAnchor="middle" fill="#ffffff" fontSize="6" fontWeight="bold">L3</text>
                  <text y="18" textAnchor="middle" fill="#047857" fontSize="7">POS-MUM</text>
                </g>

                <g className="cursor-pointer" transform="translate(430, 170)">
                  <circle r="11" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5" />
                  <circle r="7" fill="#059669" />
                  <text y="2" textAnchor="middle" fill="#ffffff" fontSize="6" fontWeight="bold">L3</text>
                  <text y="18" textAnchor="middle" fill="#047857" fontSize="7">Wallet-7X</text>
                </g>

                {/* Terminals */}
                <circle cx="500" cy="30" r="4" fill="#a1a1aa" />
                <circle cx="500" cy="90" r="4" fill="#a1a1aa" />
                <circle cx="500" cy="130" r="4" fill="#a1a1aa" />
                <circle cx="500" cy="170" r="4" fill="#a1a1aa" />
              </svg>

              {/* Floating interactive tag */}
              <div className="absolute top-2 right-2 bg-white border border-zinc-200 rounded-md px-2 py-1 text-[10px] shadow-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-zinc-700">4-Hop Trace Active</span>
              </div>
            </div>

            {/* Bottom Timeline Section in Graph Canvas */}
            <div className="mt-3 pt-2 border-t border-zinc-200 flex items-center justify-between text-xs">
              <div>
                <div className="text-[10px] font-bold text-zinc-800 uppercase tracking-tight">
                  Transaction Timeline (Chronological Flow)
                </div>
                <div className="flex items-center gap-3 text-[10px] text-zinc-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-zinc-900" /> Inflow
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-amber-500" /> Outflow
                  </span>
                </div>
              </div>

              {/* Mini timeline bar preview */}
              <div className="flex items-end gap-1 h-7">
                {[
                  { in: 40, out: 20 },
                  { in: 65, out: 50 },
                  { in: 30, out: 70 },
                  { in: 85, out: 80 },
                  { in: 25, out: 30 },
                  { in: 95, out: 90 },
                  { in: 45, out: 40 },
                ].map((bar, i) => (
                  <div key={i} className="flex gap-[2px] items-end h-full">
                    <div
                      className="w-1.5 bg-zinc-800 rounded-t-[1px]"
                      style={{ height: `${bar.in}%` }}
                    />
                    <div
                      className="w-1.5 bg-amber-500 rounded-t-[1px]"
                      style={{ height: `${bar.out}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Selected Account & Risk Inspector (4 cols) */}
          <div className="lg:col-span-4 p-4 bg-zinc-50/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Target Account Profile
                </span>
                <span className="px-1.5 py-0.5 bg-zinc-200/80 text-zinc-800 text-[9px] font-bold rounded">
                  Layer 2 Mule
                </span>
              </div>

              <div className="font-mono text-sm font-bold text-zinc-950 mt-1">
                8123 4XX 97XX
              </div>
              <div className="text-[11px] text-zinc-500 font-medium">
                HDFC Bank Ltd • IFSC: HDFC0001824
              </div>

              {/* Risk Score Circle Gauge */}
              <div className="mt-3 p-3 bg-white rounded-xl border border-zinc-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase text-zinc-500">Mule Risk Index</div>
                  <div className="text-xl font-extrabold text-rose-600 mt-0.5 font-heading">
                    82 <span className="text-xs font-normal text-zinc-400">/ 100</span>
                  </div>
                  <div className="text-[10px] font-semibold text-rose-700 flex items-center gap-1 mt-0.5">
                    <ShieldAlert className="w-3 h-3 text-rose-600" />
                    High Confidence Mule
                  </div>
                </div>

                {/* Circular ring indicator */}
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-12 h-12 transform -rotate-90">
                    <circle cx="24" cy="24" r="18" stroke="#f4f4f5" strokeWidth="4" fill="none" />
                    <circle
                      cx="24"
                      cy="24"
                      r="18"
                      stroke="#ef4444"
                      strokeWidth="4"
                      strokeDasharray="113"
                      strokeDashoffset="20"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <span className="absolute text-[11px] font-bold text-zinc-900">82%</span>
                </div>
              </div>

              {/* Forensic Details List */}
              <div className="mt-3 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between py-1 border-b border-zinc-200">
                  <span className="text-zinc-500">Total Inflow</span>
                  <span className="font-bold text-zinc-900 font-mono">₹9,12,000</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-zinc-200">
                  <span className="text-zinc-500">Total Outflow</span>
                  <span className="font-bold text-zinc-900 font-mono">₹7,85,000</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-zinc-200">
                  <span className="text-zinc-500">Velocity Ratio</span>
                  <span className="font-bold text-amber-700 font-mono">86.1% in &lt; 2h</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-zinc-200">
                  <span className="text-zinc-500">Unique Peers</span>
                  <span className="font-bold text-zinc-900">14 Accounts</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-zinc-500">First / Last Seen</span>
                  <span className="font-mono text-[10px] text-zinc-700">15 Sep – 18 Sep</span>
                </div>
              </div>
            </div>

            {/* Bottom Card Action */}
            <div className="mt-3 pt-2 border-t border-zinc-200">
              <button className="w-full py-2 px-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-xs">
                <span>View Full Lineage Audit</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Recent Transactions Subpanel */}
        <div className="bg-[#090d16] text-white px-4 py-2 flex items-center justify-between text-xs border-t border-zinc-800">
          <div className="flex items-center gap-4 overflow-x-auto text-[11px]">
            <span className="text-zinc-400 font-bold uppercase text-[9px]">Recent Ledger:</span>
            <span className="text-zinc-300 font-mono">
              ₹95,000 <span className="text-emerald-400 font-sans text-[10px]">UPI</span>
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300 font-mono">
              ₹1,50,000 <span className="text-zinc-400 font-sans text-[10px]">NEFT</span>
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300 font-mono">
              ₹75,500 <span className="text-amber-400 font-sans text-[10px]">IMPS</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
            <CheckCircle2 className="w-3 h-3" />
            <span>SHA-256 Provenance Verified</span>
          </div>
        </div>
      </div>

      {/* Floating Realistic Badge Chip on the corner */}
      <div className="hidden sm:flex items-center gap-2.5 absolute -bottom-5 -left-4 bg-white border border-zinc-200 shadow-md rounded-xl px-3.5 py-2 text-xs z-20">
        <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center font-bold text-xs border border-zinc-200">
          ₹
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-zinc-950 text-xs">₹1,30,000 Traced Hop</span>
          <span className="text-[10px] text-zinc-500 font-mono">2026-09-18 14:12 • UPI Inflow</span>
        </div>
        <span className="ml-2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
      </div>
    </div>
  );
};
