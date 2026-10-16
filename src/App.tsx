import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { RegisterTab } from './components/RegisterTab';
import { LoginTab } from './components/LoginTab';
import { StudentDashboard } from './components/StudentDashboard';
import { CredentialsTab } from './components/CredentialsTab';
import { SecurityLogsTab } from './components/SecurityLogsTab';
import { AdminTab } from './components/AdminTab';
import { InspectDrawer } from './components/InspectDrawer';
import { PhishingDemoModal } from './components/PhishingDemoModal';
import { checkBackendHealth, getMe, logout as apiLogout } from './lib/api';
import type { User, CredentialDto, InspectPacket } from './lib/types';

export function App() {
  const [activeTab, setActiveTab] = useState<
    'register' | 'login' | 'dashboard' | 'credentials' | 'logs' | 'admin'
  >('register');
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
  const [inspectOpen, setInspectOpen] = useState<boolean>(false);
  const [phishingOpen, setPhishingOpen] = useState<boolean>(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [packets, setPackets] = useState<InspectPacket[]>([]);

  // Kiểm tra kết nối backend và phiên đăng nhập cookie
  useEffect(() => {
    const checkStatus = async () => {
      const health = await checkBackendHealth();
      setIsBackendOnline(health.isOnline);
    };

    checkStatus();
    const timer = setInterval(checkStatus, 8000);

    // Kiểm tra phiên cookie có sẵn từ trước
    getMe().then((res) => {
      if (res.isSuccess && res.value) {
        setCurrentUser(res.value);
        setActiveTab('dashboard');
      }
    });

    return () => clearInterval(timer);
  }, []);

  const handleRegisterSuccess = (user: User, _credential: CredentialDto) => {
    setCurrentUser(user);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    await apiLogout();
    setCurrentUser(null);
    setActiveTab('login');
  };

  const addInspectPacket = (packet: InspectPacket) => {
    setPackets((prev) => [...prev, packet]);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (!currentUser && tab !== 'register' && tab !== 'login') {
            setActiveTab('login');
          } else {
            setActiveTab(tab);
          }
        }}
        isBackendOnline={isBackendOnline}
        onOpenInspect={() => setInspectOpen(true)}
        packetCount={packets.length}
        user={currentUser}
        onLogout={handleLogout}
        onOpenPhishingDemo={() => setPhishingOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1">
        {activeTab === 'register' && (
          <RegisterTab
            onRegisterSuccess={handleRegisterSuccess}
            onAddInspectPacket={addInspectPacket}
            onNavigateToLogin={() => setActiveTab('login')}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            isBackendOnline={isBackendOnline}
          />
        )}

        {activeTab === 'login' && (
          <LoginTab
            onLoginSuccess={handleLoginSuccess}
            onAddInspectPacket={addInspectPacket}
            onNavigateToRegister={() => setActiveTab('register')}
            currentUser={currentUser}
            isBackendOnline={isBackendOnline}
          />
        )}

        {activeTab === 'dashboard' && currentUser && (
          <StudentDashboard
            user={currentUser}
            onLogout={handleLogout}
            onAddInspectPacket={addInspectPacket}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'credentials' && currentUser && (
          <CredentialsTab
            user={currentUser}
            onAddInspectPacket={addInspectPacket}
          />
        )}

        {activeTab === 'logs' && currentUser && (
          <SecurityLogsTab
            user={currentUser}
          />
        )}

        {activeTab === 'admin' && currentUser && (
          <AdminTab
            user={currentUser}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Đồ án An Toàn & Bảo Mật Hệ Thống Thông Tin • <strong>Cổng Sinh Viên FIDO2 / WebAuthn</strong>
          </span>
          <span className="font-mono text-gray-400">
            Tech Stack: ASP.NET Core 9 • Fido2-net-lib • React 19 • Tailwind CSS v4
          </span>
        </div>
      </footer>

      {/* Inspect Data Drawer */}
      <InspectDrawer
        isOpen={inspectOpen}
        onClose={() => setInspectOpen(false)}
        packets={packets}
        onClearPackets={() => setPackets([])}
      />

      {/* Phishing Scenario Demo Modal */}
      <PhishingDemoModal
        isOpen={phishingOpen}
        onClose={() => setPhishingOpen(false)}
      />
    </div>
  );
}

export default App;
