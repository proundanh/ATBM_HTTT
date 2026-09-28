import React from 'react';
import { ShieldCheck, FileSignature, FileSearch, Lock } from 'lucide-react';

interface NavbarProps {
  activeTab: 'signer' | 'verifier';
  setActiveTab: (tab: 'signer' | 'verifier') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6 text-slate-950 stroke-[2.2]" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-slate-900 rounded-full flex items-center justify-center">
                <Lock className="w-2 h-2 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-white">
                  PDF Ed25519 Audit
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  RFC 8032
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Hệ thống Ký số & Kiểm toán Toàn vẹn Tệp tin PDF (Client-Side)
              </p>
            </div>
          </div>

          {/* Tab Navigation Controls */}
          <div className="flex items-center p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 shadow-inner">
            <button
              onClick={() => setActiveTab('signer')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'signer'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FileSignature className="w-4 h-4" />
              <span>Document Signer</span>
            </button>
            <button
              onClick={() => setActiveTab('verifier')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'verifier'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FileSearch className="w-4 h-4" />
              <span>Document Verifier</span>
            </button>
          </div>

          {/* Security Badge */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-emerald-400/90 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>100% Client-Side Engine</span>
          </div>
        </div>
      </div>
    </header>
  );
};
