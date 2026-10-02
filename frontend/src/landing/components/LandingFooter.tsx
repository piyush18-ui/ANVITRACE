import React from 'react';
import { Shield, Lock, Scale } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-[#060b18] text-slate-400 text-xs border-t border-slate-800/90 select-none overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-7">
        
        {/* Main Sleek Row: Brand + Horizontal Navigation Links */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-5 pb-5 border-b border-slate-800/70">
          
          {/* Brand & Status */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
              <img 
                src="/anvitrace-icon.png" 
                alt="Anvitrace Logo" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-white uppercase font-heading">
                ANVITRACE
              </span>
              <span className="text-[10px] font-medium text-slate-400 border-l border-slate-700/80 pl-2 hidden sm:inline-block">
                Financial Forensics
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Air-Gapped Node</span>
            </div>
          </div>

          {/* Clean Horizontal Navigation */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-300">
            <button 
              onClick={() => scrollTo('#product')} 
              className="hover:text-blue-400 transition-colors cursor-pointer"
            >
              Workspace
            </button>
            <button 
              onClick={() => scrollTo('#how-it-works')} 
              className="hover:text-blue-400 transition-colors cursor-pointer"
            >
              Pipeline
            </button>
            <button 
              onClick={() => scrollTo('#capabilities')} 
              className="hover:text-blue-400 transition-colors cursor-pointer"
            >
              Tracing
            </button>
            <button 
              onClick={() => scrollTo('#intelligence')} 
              className="hover:text-blue-400 transition-colors cursor-pointer"
            >
              Mule Detection
            </button>
            <button 
              onClick={() => scrollTo('#security')} 
              className="hover:text-blue-400 transition-colors cursor-pointer"
            >
              Evidentiary Standards
            </button>
          </nav>
        </div>

        {/* Bottom Sub-bar: Compact Copyright & Trust Tags */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            © 2026 ANVITRACE Financial Forensics. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-slate-400 text-[11px]">
            <span className="inline-flex items-center gap-1.5 hover:text-slate-300 transition-colors">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>100% Offline Air-Gapped</span>
            </span>
            <span className="inline-flex items-center gap-1.5 hover:text-slate-300 transition-colors">
              <Scale className="w-3.5 h-3.5 text-blue-400" />
              <span>Section 172 CrPC</span>
            </span>
            <span className="inline-flex items-center gap-1.5 hover:text-slate-300 transition-colors">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>SHA-256 Verified</span>
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
