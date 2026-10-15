import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { RegisterTab } from './components/RegisterTab';
import { LoginTab } from './components/LoginTab';
import { StudentDashboard } from './components/StudentDashboard';
import { InspectDrawer } from './components/InspectDrawer';
import { PhishingDemoModal } from './components/PhishingDemoModal';
import { checkBackendHealth, getMe, logout as apiLogout } from './lib/api';
import type { User, CredentialDto, InspectPacket } from './lib/types';

export function App() {
  const [activeTab, setActiveTab] = useState<'register' | 'login' | 'dashboard'>('register');
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
  const [inspectOpen, setInspectOpen] = useState<boolean>(false);
  const [phishingOpen, setPhishingOpen] = useState<boolean>(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentCredential, setCurrentCredential] = useState<CredentialDto | null>(null);
  const [packets, setPackets] = useState<InspectPacket[]>([]);

  // Kiểm tra kết nối backend và phiên đăng nhập hiện tại
  useEffect(() => {
    const checkStatus = async () => {
      const health = await checkBackendHealth();
      setIsBackendOnline(health.isOnline);
    };

    checkStatus();
    const timer = setInterval(checkStatus, 8000);

    // Kiểm tra phiên cookie có sẵn
    getMe().then((res) => {
      if (res.isSuccess && res.value) {
        setCurrentUser(res.value);
      }
    });

    return () => clearInterval(timer);
  }, []);

  const handleRegisterSuccess = (user: User, credential: CredentialDto) => {
    setCurrentUser(user);
    setCurrentCredential(credential);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    await apiLogout();
    setCurrentUser(null);
    setCurrentCredential(null);
    setActiveTab('login');
  };

  const addInspectPacket = (packet: InspectPacket) => {
    setPackets((prev) => [...prev, packet]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isBackendOnline={isBackendOnline}
        onOpenInspect={() => setInspectOpen(true)}
        packetCount={packets.length}
        user={currentUser}
        onOpenPhishingDemo={() => setPhishingOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1">
        {activeTab === 'register' && (
          <RegisterTab
            onRegisterSuccess={handleRegisterSuccess}
            onAddInspectPacket={addInspectPacket}
            onNavigateToLogin={() => setActiveTab('login')}
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
            credential={currentCredential}
            onLogout={handleLogout}
            onAddInspectPacket={addInspectPacket}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Đồ án An Toàn & Bảo Mật Hệ Thống Thông Tin • <strong>FIDO2 / WebAuthn Passkeys</strong>
          </span>
          <span className="font-mono text-slate-600">
            Tech Stack: ASP.NET Core 9 • Fido2-net-lib • React 19 • Tailwind CSS
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
