import { useState, type FormEvent } from 'react';
import {
  User as UserIcon,
  ShieldCheck,
  Laptop,
  CreditCard,
  LogOut,
  Fingerprint,
  CheckCircle2,
  Lock,
  Smartphone,
} from 'lucide-react';
import type { User, CredentialDto, InspectPacket } from '../lib/types';

interface StudentDashboardProps {
  user: User;
  credential?: CredentialDto | null;
  onLogout: () => void;
  onAddInspectPacket: (packet: InspectPacket) => void;
}

export const StudentDashboard = ({
  user,
  credential,
  onLogout,
  onAddInspectPacket,
}: StudentDashboardProps) => {
  const [scholarshipAccount, setScholarshipAccount] = useState('1029384756');
  const [phone, setPhone] = useState('0912345678');
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [stepUpSuccess, setStepUpSuccess] = useState(false);
  const [stepUpLoading, setStepUpLoading] = useState(false);

  const handleTriggerStepUp = (e: FormEvent) => {
    e.preventDefault();
    setStepUpOpen(true);
    setStepUpSuccess(false);
  };

  const handlePerformStepUp = async () => {
    setStepUpLoading(true);

    try {
      // Mô phỏng luồng Step-up Authentication theo tài liệu
      // Gọi options -> Quét vân tay -> Xác minh chữ ký
      await new Promise((res) => setTimeout(res, 1200));

      onAddInspectPacket({
        id: `pkt-${Date.now()}-stepup`,
        title: 'Step-up Authentication (Xác thực nhạy cảm)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'stepup',
        phase: 'Server Verify Result',
        data: {
          action: 'UpdateProfile',
          payload: { phone, scholarshipAccount },
          userVerified: true,
          tokenExpiresIn: 120,
        },
        notes:
          'Sinh viên đã quét lại Passkey để cấp StepUpToken dùng 1 lần (TTL 120s), đảm bảo chính chủ kể cả khi quên khóa màn hình máy tính.',
      });

      setStepUpSuccess(true);
      setTimeout(() => {
        setStepUpOpen(false);
      }, 1500);
    } catch {
      //
    } finally {
      setStepUpLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold text-xl shadow-lg shadow-emerald-500/20">
            {user.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white">{user.fullName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {user.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              MSSV: <span className="text-emerald-400 font-bold">{user.studentCode}</span> • {user.email || 'Sinh viên'}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold transition-all flex items-center space-x-1.5"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile & Sensitive Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sensitive Action Card: Scholarship Account (Step-up Authentication) */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Thủ tục Nhạy cảm: Số Tài Khoản Nhận Học Bổng</h2>
                  <p className="text-xs text-slate-400">Yêu cầu bảo vệ bằng Step-up Authentication (quét lại vân tay)</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-950/40 px-2 py-1 rounded-lg border border-indigo-500/30">
                Bảo vệ 2 lớp
              </span>
            </div>

            <form onSubmit={handleTriggerStepUp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Số điện thoại liên lạc
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Số tài khoản ngân hàng nhận học bổng
                  </label>
                  <input
                    type="text"
                    value={scholarshipAccount}
                    onChange={(e) => setScholarshipAccount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
                <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Cơ chế Step-up:</strong> Khi lưu thông tin nhạy cảm, hệ thống bắt buộc quét lại vân tay/Passkey một lần nữa để xác nhận chính chủ, bảo vệ tài khoản ngay cả khi sinh viên quên khóa màn hình tại thư viện.
                </span>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-2"
              >
                <Fingerprint className="w-4 h-4" />
                <span>Xác nhận Lưu & Quét Lại Passkey</span>
              </button>
            </form>
          </div>

          {/* Student Academic Info Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
              <UserIcon className="w-4 h-4 text-emerald-400" />
              <span>Thông Tin Đào Tạo & Tín Chỉ</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400">Niên Khóa</div>
                <div className="text-sm font-bold text-white mt-1">2022 - 2026</div>
              </div>
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400">Tín Chỉ Tích Lũy</div>
                <div className="text-sm font-bold text-emerald-400 mt-1">112 / 140</div>
              </div>
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400">Điểm GPA</div>
                <div className="text-sm font-bold text-cyan-400 mt-1">3.62 / 4.0</div>
              </div>
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400">Trạng Thái</div>
                <div className="text-sm font-bold text-emerald-400 mt-1">Đang Học</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Trusted Passkey Devices & Security Status */}
        <div className="space-y-6">
          {/* Trusted Devices Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Laptop className="w-4 h-4 text-emerald-400" />
                <span>Thiết Bị Đã Liên Kết Passkey</span>
              </h2>
              <span className="text-[10px] font-mono text-slate-400">1 thiết bị</span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                      <Fingerprint className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {credential?.deviceName || 'Thiết bị hiện tại (Windows Hello)'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Ngày tạo: {credential?.createdAt ? new Date(credential.createdAt).toLocaleDateString() : 'Hôm nay'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Thiết bị này
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-900 flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Thuật toán: ES256 (P-256)</span>
                  <span className="text-emerald-400 font-semibold">Khóa an toàn</span>
                </div>
              </div>
            </div>

            <button
              disabled
              className="mt-4 w-full py-2 px-3 rounded-xl bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700/60 opacity-60 cursor-not-allowed flex items-center justify-center space-x-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Đăng ký thêm thiết bị phụ (Demo)</span>
            </button>
          </div>

          {/* Security Architecture Badge */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3 text-xs">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Kiến Trúc Mật Mã FIDO2 / WebAuthn</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
              <li className="flex items-start space-x-1.5">
                <span className="text-emerald-400">✓</span>
                <span><strong>Zero-Password:</strong> Hoàn toàn không có mật khẩu nào được lưu trữ ở Database.</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <span className="text-emerald-400">✓</span>
                <span><strong>Hardware-Bound:</strong> Khóa riêng nằm trong chip TPM / Secure Enclave.</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <span className="text-emerald-400">✓</span>
                <span><strong>Chống Phishing:</strong> Trình duyệt gắn chặt chữ ký với RP ID (Domain).</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Step-up Authentication Modal */}
      {stepUpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
            {stepUpSuccess ? (
              <div>
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Xác Thực Sinh Trắc Học Hợp Lệ!</h3>
                <p className="text-xs text-slate-300">Thông tin nhạy cảm đã được cập nhật thành công.</p>
              </div>
            ) : (
              <div>
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/20">
                  <Fingerprint className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Xác Nhận Thay Đổi Bằng Passkey</h3>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  Để đảm bảo an toàn, vui lòng chạm cảm biến sinh trắc học (vân tay / Touch ID / Windows Hello) để xác nhận chính chủ sinh viên <strong>{user.studentCode}</strong>.
                </p>

                <div className="space-y-2">
                  <button
                    onClick={handlePerformStepUp}
                    disabled={stepUpLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center space-x-2"
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>{stepUpLoading ? 'Đang xác thực vân tay...' : 'Chạm vân tay xác nhận ngay'}</span>
                  </button>

                  <button
                    onClick={() => setStepUpOpen(false)}
                    disabled={stepUpLoading}
                    className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
