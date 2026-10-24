import React from 'react';
import { ArrowRight, Shield, Cpu, Briefcase, Lock, CheckCircle2 } from 'lucide-react';

interface FinalCTASectionProps {
  onLaunchInvestigation: () => void;
}

export const FinalCTASection: React.FC<FinalCTASectionProps> = ({ onLaunchInvestigation }) => {
  return (
    <section className="relative pt-24 pb-20 bg-[#090d16] text-white overflow-hidden border-t border-zinc-800">
      
      {/* Background Architectural Landmark / High Court Commissionerate Silhouette */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Faint classical commissionerate / court dome silhouette */}
        <svg 
          className="absolute right-0 lg:right-12 bottom-0 h-[380px] w-auto text-zinc-700 opacity-[0.20]"
          viewBox="0 0 600 400" 
          fill="currentColor"
        >
          {/* Main Classical Dome & Lantern */}
          <path d="M 300 20 L 303 50 L 297 50 Z" />
          <rect x="294" y="50" width="12" height="18" rx="2" />
          {/* Lantern dome cap */}
          <path d="M 285 68 C 285 55, 315 55, 315 68 Z" />
          {/* Lantern columns */}
          <rect x="288" y="68" width="4" height="24" />
          <rect x="298" y="68" width="4" height="24" />
          <rect x="308" y="68" width="4" height="24" />
          {/* Dome base drum */}
          <rect x="275" y="92" width="50" height="12" rx="2" />
          {/* Great Dome */}
          <path d="M 230 190 C 230 100, 370 100, 370 190 Z" />
          {/* Dome Ribs */}
          <path d="M 300 104 L 300 190" stroke="#52525b" strokeWidth="2" fill="none" opacity="0.4" />
          <path d="M 265 118 C 275 140, 275 170, 272 190" stroke="#52525b" strokeWidth="2" fill="none" opacity="0.3" />
          <path d="M 335 118 C 325 140, 325 170, 328 190" stroke="#52525b" strokeWidth="2" fill="none" opacity="0.3" />
          
          {/* Drum with arched windows */}
          <rect x="220" y="190" width="160" height="35" rx="3" />
          <path d="M 240 215 C 240 200, 252 200, 252 215 Z" fill="#090d16" opacity="0.5" />
          <path d="M 265 215 C 265 200, 277 200, 277 215 Z" fill="#090d16" opacity="0.5" />
          <path d="M 294 215 C 294 200, 306 200, 306 215 Z" fill="#090d16" opacity="0.5" />
          <path d="M 323 215 C 323 200, 335 200, 335 215 Z" fill="#090d16" opacity="0.5" />
          <path d="M 348 215 C 348 200, 360 200, 360 215 Z" fill="#090d16" opacity="0.5" />

          {/* Pediment / Triangular Portico */}
          <path d="M 170 235 L 300 185 L 430 235 Z" opacity="0.9" />
          <rect x="160" y="235" width="280" height="15" />

          {/* Classical Colonnade */}
          <rect x="180" y="250" width="12" height="140" />
          <rect x="212" y="250" width="12" height="140" />
          <rect x="244" y="250" width="12" height="140" />
          <rect x="276" y="250" width="12" height="140" />
          <rect x="312" y="250" width="12" height="140" />
          <rect x="344" y="250" width="12" height="140" />
          <rect x="376" y="250" width="12" height="140" />
          <rect x="408" y="250" width="12" height="140" />

          {/* Left & Right Wings */}
          <rect x="40" y="240" width="120" height="150" opacity="0.7" />
          <rect x="440" y="240" width="130" height="150" opacity="0.7" />

          {/* Wing windows */}
          <rect x="60" y="260" width="16" height="24" rx="2" fill="#090d16" opacity="0.5" />
          <rect x="90" y="260" width="16" height="24" rx="2" fill="#090d16" opacity="0.5" />
          <rect x="120" y="260" width="16" height="24" rx="2" fill="#090d16" opacity="0.5" />
          <rect x="460" y="260" width="16" height="24" rx="2" fill="#090d16" opacity="0.5" />
          <rect x="490" y="260" width="16" height="24" rx="2" fill="#090d16" opacity="0.5" />
          <rect x="520" y="260" width="16" height="24" rx="2" fill="#090d16" opacity="0.5" />

          <rect x="60" y="300" width="16" height="30" rx="2" fill="#090d16" opacity="0.5" />
          <rect x="90" y="300" width="16" height="30" rx="2" fill="#090d16" opacity="0.5" />
          <rect x="120" y="300" width="16" height="30" rx="2" fill="#090d16" opacity="0.5" />
          <rect x="460" y="300" width="16" height="30" rx="2" fill="#090d16" opacity="0.5" />
          <rect x="490" y="300" width="16" height="30" rx="2" fill="#090d16" opacity="0.5" />
          <rect x="520" y="300" width="16" height="30" rx="2" fill="#090d16" opacity="0.5" />

          {/* Base stairs */}
          <rect x="10" y="390" width="580" height="10" />
        </svg>

        {/* Ambient Network Nodes */}
        <div 
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(#a1a1aa 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Mission Headline, Supporting Copy, Actions */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            
            {/* Translucent Frosted Badge matching reference */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold tracking-wider uppercase mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>TRUSTED FOR A SAFER FINANCIAL ECOSYSTEM</span>
            </div>

            {/* Crisp, clean, impactful all-white headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.18] mb-5">
              Empowering Investigations <br />
              with Technology
            </h2>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-xl mb-9 font-normal">
              ANVITRACE helps law enforcement and financial investigators detect fraud, stop mule networks and bring financial crimes to justice.
            </p>

            {/* Dual CTAs: Solid Amber primary + Solid Charcoal secondary */}
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
              <button
                onClick={onLaunchInvestigation}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-7 py-3.5 rounded-xl text-sm transition-all shadow-md active:scale-[0.98] cursor-pointer"
              >
                <span>Launch Investigation</span>
                <ArrowRight className="w-4 h-4 text-zinc-950" />
              </button>

              <button
                onClick={() => {
                  const el = document.querySelector('#capabilities');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-semibold px-6 py-3.5 rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <span>Explore Capabilities</span>
              </button>
            </div>

            {/* Factual reassurance badge */}
            <div className="mt-8 flex items-center gap-2 text-xs text-zinc-400 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Air-gapped deployment • 100% on-premise execution</span>
            </div>
          </div>

          {/* Right Column: 3 Solid Dark Charcoal Cards */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Card 1: Secure & Offline */}
            <div className="p-5 bg-zinc-900/90 rounded-xl border border-zinc-800 hover:border-zinc-700 shadow-sm flex items-start gap-4 transition-all duration-300 group hover:translate-x-1">
              <div className="w-11 h-11 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-amber-500/50 group-hover:text-amber-400 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white tracking-tight">Secure &amp; Offline</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-normal">
                  No cloud dependency. Air-gapped execution preserves sovereign evidence custody.
                </p>
              </div>
            </div>

            {/* Card 2: Explainable AI / Forensics */}
            <div className="p-5 bg-zinc-900/90 rounded-xl border border-zinc-800 hover:border-zinc-700 shadow-sm flex items-start gap-4 transition-all duration-300 group hover:translate-x-1">
              <div className="w-11 h-11 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-amber-500/50 group-hover:text-amber-400 transition-colors">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white tracking-tight">Explainable AI</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-normal">
                  Transparent risk scoring based on deterministic rules and velocity metrics.
                </p>
              </div>
            </div>

            {/* Card 3: Built for Investigators */}
            <div className="p-5 bg-zinc-900/90 rounded-xl border border-zinc-800 hover:border-zinc-700 shadow-sm flex items-start gap-4 transition-all duration-300 group hover:translate-x-1">
              <div className="w-11 h-11 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-amber-500/50 group-hover:text-amber-400 transition-colors">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white tracking-tight">Built for Investigators</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-normal">
                  Real world investigation workflows designed for police cells and cyber squads.
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
