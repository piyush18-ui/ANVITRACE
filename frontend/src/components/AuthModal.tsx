import React, { useState } from 'react';
import {
  ShieldCheck,
  Check,
  ArrowRight,
  X,
  Lock,
} from 'lucide-react';

export interface OfficerProfile {
  id: string;
  name: string;
  badge: string;
  role: string;
  department: string;
  agency: string;
  pin: string;
  clearance: string;
  initials: string;
  themeColor: string;
}

export const DUMMY_OFFICERS: OfficerProfile[] = [
  {
    id: 'off_01',
    name: 'Inspector Vikram Sharma',
    badge: 'CY-8842',
    role: 'Lead Cyber Forensic Investigator',
    department: 'Cyber Crime Investigation Division',
    agency: 'State Cyber Cell',
    pin: '8842',
    clearance: 'Level 3 • Air-Gapped Core',
    initials: 'VS',
    themeColor: 'bg-slate-900 text-amber-400',
  },
  {
    id: 'off_02',
    name: 'Officer Rajesh Kulkarni',
    badge: 'FIU-2091',
    role: 'Senior Financial Intelligence Analyst',
    department: 'Mule Syndicate Tracking Wing',
    agency: 'Financial Intelligence Unit (FIU)',
    pin: '2091',
    clearance: 'Level 4 • Sec 102 CrPC Signatory',
    initials: 'RK',
    themeColor: 'bg-slate-900 text-blue-400',
  },
  {
    id: 'off_03',
    name: 'Dr. Priya Menon',
    badge: 'FAS-5134',
    role: 'Forensic Audit & Lineage Specialist',
    department: 'Anti-Money Laundering (AML) Lab',
    agency: 'Directorate of Forensic Sciences',
    pin: '5134',
    clearance: 'Level 2 • Multi-Hop Traversal',
    initials: 'PM',
    themeColor: 'bg-slate-900 text-emerald-400',
  },
];

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (officer: OfficerProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticate,
}) => {
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerProfile>(DUMMY_OFFICERS[0]);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectAndSubmit = (officer: OfficerProfile) => {
    setSelectedOfficer(officer);
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onAuthenticate(officer);
    }, 280);
  };

  const handleProceed = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onAuthenticate(selectedOfficer);
    }, 280);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden text-slate-900 p-6 sm:p-7 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Top bar with close button */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-amber-400 shadow-sm ring-1 ring-slate-800">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950 tracking-tight leading-tight">
                Sign in to ANVITRACE
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select an authorized investigator session
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* 3 Selectable Profile Cards */}
        <div className="space-y-2 mb-5">
          {DUMMY_OFFICERS.map((officer) => {
            const isSelected = selectedOfficer.id === officer.id;
            return (
              <button
                type="button"
                key={officer.id}
                onClick={() => setSelectedOfficer(officer)}
                onDoubleClick={() => handleSelectAndSubmit(officer)}
                className={`w-full p-3.5 rounded-xl border text-left transition-all duration-150 flex items-center justify-between cursor-pointer group ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Initials Avatar */}
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-slate-800 text-amber-400 border border-slate-700'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-slate-200/80'
                    }`}
                  >
                    {officer.initials}
                  </div>

                  {/* Profile Info */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold tracking-tight truncate">
                        {officer.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded ${
                          isSelected
                            ? 'bg-slate-800 text-slate-300 border border-slate-700'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        #{officer.badge}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] truncate mt-0.5 ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {officer.role}
                    </span>
                  </div>
                </div>

                {/* Right Selection Indicator */}
                <div className="shrink-0 pl-2">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950'
                        : 'border border-slate-300 group-hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={handleProceed}
          disabled={isVerifying}
          className="w-full h-11 bg-slate-950 hover:bg-slate-900 active:bg-black text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isVerifying ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Entering workspace...</span>
            </>
          ) : (
            <>
              <span>Continue as {selectedOfficer.name.split(' ')[0]} {selectedOfficer.name.split(' ')[1]}</span>
              <ArrowRight size={14} className="text-slate-400" />
            </>
          )}
        </button>

        {/* Subtle Security Badge */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <Lock size={12} className="text-slate-400" />
          <span>Air-gapped session • 100% offline verification</span>
        </div>
      </div>
    </div>
  );
};
