import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { SignerTab } from './components/SignerTab';
import { VerifierTab } from './components/VerifierTab';
import { ShieldCheck, Cpu, Database, EyeOff } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'signer' | 'verifier'>('signer');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Background radial gradients for subtle modern glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-emerald-500/10 rounded-full blur-[130px] opacity-70" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[120px] opacity-50" />
      </div>

      {/* Navigation Header */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Hero Banner / Subtitle */}
        <div className="text-center mb-10 max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Đồ án An Toàn & Bảo Mật Hệ Thống Thông Tin</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Chữ Ký Số <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Ed25519</span> &amp; Kiểm Toán Tệp Tin PDF
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Giải pháp nhúng file gốc nguyên vẹn (PDF Attachment) kết hợp sinh trang chứng thực Audit Trail và mã phản hồi nhanh QR Code. Khắc phục triệt để bẫy PDF serialization, đảm bảo tính toàn vẹn và bất biến 100%.
          </p>

          {/* Quick Pillars */}
          <div className="pt-2 flex items-center justify-center flex-wrap gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              100% Client-Side Engine
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              Bảo toàn Bit-Exact
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
              Zero Server Uploads
            </span>
          </div>
        </div>

        {/* Dynamic Tab Body */}
        {activeTab === 'signer' ? <SignerTab /> : <VerifierTab />}
      </main>

      {/* Modern Footer */}
      <footer className="relative z-10 border-t border-slate-850 bg-slate-950/80 backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-400 font-medium">PDF Ed25519 Cryptographic Audit System</span>
          </div>
          <div>
            <span>Công nghệ: React 19 • Tailwind CSS • @noble/curves • pdf-lib • Web Crypto API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
