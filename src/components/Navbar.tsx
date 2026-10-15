import { ShieldCheck, Fingerprint, KeyRound, Server, Eye, Globe } from 'lucide-react';

interface NavbarProps {
  activeTab: 'register' | 'login' | 'dashboard';
  setActiveTab: (tab: 'register' | 'login' | 'dashboard') => void;
  isBackendOnline: boolean;
  onOpenInspect: () => void;
  packetCount: number;
  user: any;
  onOpenPhishingDemo: () => void;
}

export const Navbar = ({
  activeTab,
  setActiveTab,
  isBackendOnline,
  onOpenInspect,
  packetCount,
  user,
  onOpenPhishingDemo,
}: NavbarProps) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('register')}>
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="w-6 h-6 text-slate-950 stroke-[2.5]" />
              </div>
              <Fingerprint className="w-4 h-4 text-emerald-300 absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-emerald-500/40" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">EduPasskey</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  FIDO2 / WebAuthn
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Cổng thông tin sinh viên bảo mật không mật khẩu
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('register')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'register'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Đăng ký Passkey</span>
            </button>

            <button
              onClick={() => setActiveTab('login')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'login'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Fingerprint className="w-4 h-4" />
              <span>Đăng nhập</span>
            </button>

            {user && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center space-x-1.5 ${
                  activeTab === 'dashboard'
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
                }`}
              >
                <span>Cổng Sinh Viên</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </button>
            )}
          </nav>

          {/* Right Status Badges & Tools */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Phishing demo pill */}
            <button
              onClick={onOpenPhishingDemo}
              className="hidden lg:flex items-center space-x-1 text-xs bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
              title="Xem giải thích cơ chế chống Phishing bằng RP ID"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Chống Phishing</span>
            </button>

            {/* Backend Status indicator */}
            <div
              className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-lg border ${
                isBackendOnline
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-400'
              }`}
              title={isBackendOnline ? 'Backend ASP.NET Core đang phản hồi' : 'Chưa kết nối Backend .NET tại port 5105'}
            >
              <Server className="w-3.5 h-3.5" />
              <span className="hidden md:inline font-mono">
                {isBackendOnline ? 'BE :5105' : 'BE Offline'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isBackendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              ></span>
            </div>

            {/* Inspect Data Button */}
            <button
              onClick={onOpenInspect}
              className="flex items-center space-x-1.5 text-xs bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 px-2.5 py-1.5 rounded-lg transition-all"
              title="Thanh tra các gói tin JSON WebAuthn phục vụ thuyết trình"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium hidden sm:inline">Inspect Data</span>
              {packetCount > 0 && (
                <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {packetCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
