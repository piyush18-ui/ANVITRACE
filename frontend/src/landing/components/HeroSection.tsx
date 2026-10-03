import React, { useState } from 'react';
import { ArrowRight, Play, Database, Network, ShieldCheck, Building2, Landmark, Shield, Cpu } from 'lucide-react';
import { Globe } from '../ui/globe';
import { VideoModal } from './VideoModal';

interface HeroSectionProps {
  onLaunchInvestigation: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onLaunchInvestigation }) => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const proofMetrics = [
    {
      value: '2M+',
      label: 'Transactions',
      sub: 'Processed in < 60s',
      icon: Database,
    },
    {
      value: '4-Hop',
      label: 'Money Tracing',
      sub: 'Temporal Layering',
      icon: Network,
    },
    {
      value: '100% Local',
      label: 'Offline Core',
      sub: 'Air-Gapped & Secure',
      icon: ShieldCheck,
    },
  ];

  const handleSeeHowItWorks = () => {
    setIsVideoModalOpen(true);
  };

  return (
    <section id="hero" className="relative pt-8 pb-16 lg:pt-14 lg:pb-24 overflow-hidden bg-[#fafafc] border-b border-zinc-200/70">
      {/* Subtle fine background grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.35] pointer-events-none -z-10"
        style={{
          backgroundImage: 'linear-gradient(to right, #e4e4e7 1px, transparent 1px), linear-gradient(to bottom, #e4e4e7 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline, Copy, CTAs, Proof Metrics */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            {/* Supporting Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold tracking-wider uppercase mb-6 shadow-xs">
              <img src="/anvitrace-icon.png" alt="ANVITRACE" className="w-4 h-4 rounded object-contain" />
              <span>OFFLINE • SECURE • EVIDENCE-DRIVEN</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-zinc-950 tracking-tight leading-[1.12] mb-5 font-heading">
              Trace the Money. <br />
              <span className="text-zinc-600 font-bold">Expose the Network.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg text-zinc-600 leading-relaxed max-w-xl mb-8">
              ANVITRACE is an offline cyber-forensics platform for tracing financial fraud, detecting mule networks and turning transaction data into actionable evidence.
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 w-full sm:w-auto mb-10">
              <button
                onClick={onLaunchInvestigation}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white font-medium px-6 py-3 rounded-xl text-xs transition-all shadow-xs active:scale-[0.98] cursor-pointer"
              >
                <span>Launch Investigation</span>
                <ArrowRight className="w-4 h-4 text-zinc-300" />
              </button>

              <button
                onClick={handleSeeHowItWorks}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 font-medium px-5 py-3 rounded-xl text-xs transition-all shadow-xs active:scale-[0.98] cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-zinc-600 fill-zinc-600" />
                <span>See How It Works</span>
              </button>
            </div>

            {/* 3 Compact Proof Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full pt-6 border-t border-zinc-200">
              {proofMetrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div
                    key={metric.label}
                    className="p-3.5 bg-white rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between hover:border-zinc-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-6 h-6 rounded-md bg-zinc-100 text-zinc-800 flex items-center justify-center border border-zinc-200/60">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-zinc-950 tracking-tight font-heading">
                        {metric.value}
                      </div>
                      <div className="text-[11px] font-semibold text-zinc-700 leading-tight">
                        {metric.label}
                      </div>
                      <div className="text-[9px] text-zinc-400 font-normal">
                        {metric.sub}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Interactive 3D Globe */}
          <div className="lg:col-span-6 w-full mt-6 lg:mt-0 flex items-center justify-center">
            <Globe
              width="100%"
              height={520}
              primaryColor="#f59e0b"
              neutralColor="#71717a"
              autoRotateSpeed={0.6}
              showAtmosphere={true}
              pointSize={0.30}
              arcCount={8}
              arcInterval={5000}
              arcAnimationDuration={2400}
              cameraAltitude={2.2}
              landDotRows={220}
              className="w-full max-w-[580px]"
            />
          </div>


        </div>

        {/* Built for Law Enforcement Trust Strip */}
        <div className="mt-14 pt-8 border-t border-zinc-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="text-xs font-bold text-zinc-800 uppercase tracking-wider font-heading">
                Built for Law Enforcement &amp; Forensics Investigations
              </div>
              <div className="text-xs text-zinc-500 mt-0.5 font-sans">
                Engineered specifically for cyber cells, police commissionerates and bank audit teams.
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-zinc-700">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-zinc-200 shadow-xs">
                <Building2 className="w-3.5 h-3.5 text-zinc-600" />
                <span>Police Departments</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-zinc-200 shadow-xs">
                <Shield className="w-3.5 h-3.5 text-zinc-600" />
                <span>Cyber Crime Cells</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-zinc-200 shadow-xs">
                <Cpu className="w-3.5 h-3.5 text-zinc-600" />
                <span>Financial Investigators</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-zinc-200 shadow-xs">
                <Landmark className="w-3.5 h-3.5 text-zinc-600" />
                <span>Regulatory Agencies</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Demo Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoSrc="/demo-video.mp4"
      />
    </section>
  );
};
