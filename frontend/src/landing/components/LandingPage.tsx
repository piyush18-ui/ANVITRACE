import React from 'react';
import '../index.css';
import { LandingNavbar } from './LandingNavbar';
import { HeroSection } from './HeroSection';
import { ProblemSolutionSection } from './ProblemSolutionSection';
import { HowItWorksSection } from './HowItWorksSection';
import { CapabilityGrid } from './CapabilityGrid';
import { ProductShowcaseSection } from './ProductShowcaseSection';
import { IntelligenceSection } from './IntelligenceSection';
import { EvidenceSecuritySection } from './EvidenceSecuritySection';
import { FinalCTASection } from './FinalCTASection';
import { LandingFooter } from './LandingFooter';

interface LandingPageProps {
  onLaunchInvestigation: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchInvestigation }) => {
  return (
    <div className="w-full min-h-screen bg-[#fbfbfd] text-zinc-900 font-sans antialiased overflow-x-hidden selection:bg-amber-100 selection:text-amber-950">
      {/* Global Sticky Navbar */}
      <LandingNavbar onLaunchInvestigation={onLaunchInvestigation} />

      {/* Screen 1: Hero */}
      <HeroSection onLaunchInvestigation={onLaunchInvestigation} />

      {/* Screen 2: Problem + Solution (The Challenge) */}
      <ProblemSolutionSection />

      {/* Screen 3: How It Works */}
      <HowItWorksSection onLaunchInvestigation={onLaunchInvestigation} />

      {/* Screen 4: Core Capabilities (2x3 Grid matching Reference) */}
      <CapabilityGrid onLaunchInvestigation={onLaunchInvestigation} />

      {/* Screen 5: Product Showcase (Largest Product Preview) */}
      <ProductShowcaseSection onLaunchInvestigation={onLaunchInvestigation} />

      {/* Screen 6: Investigation Intelligence (Lineage, Risk, Cross-Victim) */}
      <IntelligenceSection />

      {/* Screen 7: Evidence & Trust (Case Diary, Freeze Requisition, Trust Panel) */}
      <EvidenceSecuritySection />

      {/* Screen 8: Final CTA (Dark Mission Control Banner) */}
      <FinalCTASection onLaunchInvestigation={onLaunchInvestigation} />

      {/* Footer */}
      <LandingFooter />
    </div>
  );
};
