import { Shield, Fingerprint, KeyRound, Server, Eye, Globe, Laptop, History, LogOut } from 'lucide-react';
import type { User } from '../lib/types';

interface NavbarProps {
  activeTab: 'register' | 'login' | 'dashboard' | 'credentials' | 'logs' | 'admin';
  setActiveTab: (tab: 'register' | 'login' | 'dashboard' | 'credentials' | 'logs' | 'admin') => void;
  isBackendOnline: boolean;
  onOpenInspect: () => void;
  packetCount: number;
  user: User | null;
  onLogout: () => void;
  onOpenPhishingDemo: () => void;
}

export const Navbar = ({
  activeTab,
  setActiveTab,
  isBackendOnline,
  onOpenInspect,
  packetCount,
  user,
  onLogout,
  onOpenPhishingDemo,
}: NavbarProps) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={() => setActiveTab(user ? 'dashboard' : 'register')}
          >
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-gray-900 tracking-tight">EduPasskey</span>
                <span className="text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80">
                  FIDO2 / WebAuthn
                </span>
              </div>
              <p className="text-[11px] text-gray-500 hidden sm:block">
                Cổng thông tin sinh viên bảo mật không dùng mật khẩu
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 bg-gray-100/80 p-1 rounded-lg border border-gray-200">
            {!user ? (
              <>
                <button
                  onClick={() => setActiveTab('register')}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                    activeTab === 'register'
                      ? 'bg-white text-gray-900 shadow-xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Đăng ký Passkey</span>
                </button>

                <button
                  onClick={() => setActiveTab('login')}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                    activeTab === 'login'
                      ? 'bg-white text-gray-900 shadow-xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === 'dashboard'
                      ? 'bg-white text-gray-900 shadow-xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Hồ sơ sinh viên
                </button>

                <button
                  onClick={() => setActiveTab('credentials')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                    activeTab === 'credentials'
                      ? 'bg-white text-gray-900 shadow-xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Thiết bị bảo mật</span>
                </button>

                <button
                  onClick={() => setActiveTab('logs')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                    activeTab === 'logs'
                      ? 'bg-white text-gray-900 shadow-xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Nhật ký bảo mật</span>
                </button>

                {user.role === 'Admin' && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      activeTab === 'admin'
                        ? 'bg-white text-blue-700 shadow-xs font-semibold'
                        : 'text-blue-600 hover:text-blue-800'
                    }`}
                  >
                    Quản trị viên
                  </button>
                )}
              </>
            )}
          </nav>

          {/* Right Status Badges & Tools */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Phishing demo pill */}
            <button
              onClick={onOpenPhishingDemo}
              className="hidden lg:flex items-center space-x-1.5 text-xs text-gray-600 hover:text-gray-900 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Xem giải thích cơ chế chống Phishing bằng RP ID"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>Chống Phishing</span>
            </button>

            {/* Backend Status indicator */}
            <div
              className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full border ${
                isBackendOnline
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
              title={isBackendOnline ? 'Backend ASP.NET Core đang phản hồi' : 'Chưa kết nối Backend .NET tại port 5105'}
            >
              <Server className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-mono">
                {isBackendOnline ? 'BE :5105 Online' : 'BE Offline'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isBackendOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`}
              ></span>
            </div>

            {/* Inspect Data Button */}
            <button
              onClick={onOpenInspect}
              className="flex items-center space-x-1.5 text-xs bg-gray-100 hover:bg-gray-200/80 text-gray-700 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
              title="Thanh tra các gói tin JSON WebAuthn phục vụ thuyết trình"
            >
              <Eye className="w-3.5 h-3.5 text-gray-600" />
              <span className="hidden sm:inline">Inspect Data</span>
              {packetCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {packetCount}
                </span>
              )}
            </button>

            {/* User Session Info / Logout */}
            {user && (
              <div className="flex items-center space-x-2 pl-2 border-l border-gray-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-gray-900 leading-tight">{user.fullName}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{user.studentCode}</div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden border-t border-gray-200 px-4 py-2 bg-gray-50 flex items-center justify-around text-xs">
        {!user ? (
          <>
            <button
              onClick={() => setActiveTab('register')}
              className={`py-1 px-3 rounded-md font-medium ${
                activeTab === 'register' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              Đăng ký
            </button>
            <button
              onClick={() => setActiveTab('login')}
              className={`py-1 px-3 rounded-md font-medium ${
                activeTab === 'login' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              Đăng nhập
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-1 px-2.5 rounded-md font-medium ${
                activeTab === 'dashboard' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              Hồ sơ
            </button>
            <button
              onClick={() => setActiveTab('credentials')}
              className={`py-1 px-2.5 rounded-md font-medium ${
                activeTab === 'credentials' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              Thiết bị
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-1 px-2.5 rounded-md font-medium ${
                activeTab === 'logs' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              Nhật ký
            </button>
            {user.role === 'Admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`py-1 px-2.5 rounded-md font-medium ${
                  activeTab === 'admin' ? 'bg-white text-blue-700 shadow-xs' : 'text-blue-600'
                }`}
              >
                Admin
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
};
