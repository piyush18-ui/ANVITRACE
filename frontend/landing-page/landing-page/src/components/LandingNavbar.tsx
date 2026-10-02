import React, { useState } from 'react';
import { ArrowRight, Menu, X, Shield, Lock } from 'lucide-react';

interface LandingNavbarProps {
  onLaunchInvestigation: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onLaunchInvestigation }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Product', href: '#product' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Capabilities', href: '#capabilities' },
    { label: 'Intelligence', href: '#intelligence' },
    { label: 'Security', href: '#security' },
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-zinc-200 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Brand Name */}
          <div className="flex items-center gap-3">
            <a href="#hero" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl border border-zinc-200/90 p-1 flex items-center justify-center bg-white shadow-xs group-hover:scale-105 transition-transform duration-200 shrink-0 overflow-hidden">
                <img 
                  src="/anvitrace-icon.png" 
                  alt="Anvitrace Logo" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-zinc-950 uppercase font-heading">
                ANVITRACE
              </span>
            </a>

            <div className="hidden lg:flex items-center ml-4 pl-4 border-l border-zinc-200 text-[11px] font-medium text-zinc-700 bg-zinc-100 px-2.5 py-0.5 rounded-md border border-zinc-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
              100% Offline Core
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="text-xs font-medium text-zinc-600 hover:text-zinc-950 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action CTA */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={onLaunchInvestigation}
              className="inline-flex items-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg text-xs font-medium transition-all shadow-xs active:scale-[0.98] cursor-pointer"
            >
              <span>Launch Investigation</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-300" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onLaunchInvestigation}
              className="bg-zinc-950 text-white px-3 py-1.5 rounded-md text-xs font-medium"
            >
              Launch
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-md">
          <div className="flex flex-col space-y-1.5">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="px-3 py-2 rounded-md text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="pt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLaunchInvestigation();
              }}
              className="w-full flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-lg text-xs font-medium shadow-xs"
            >
              <span>Launch Investigation</span>
              <ArrowRight className="w-4 h-4 text-zinc-300" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
