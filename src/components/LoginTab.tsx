import { useState } from 'react';
import {
  Fingerprint,
  User as UserIcon,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info,
  Key,
} from 'lucide-react';
import { requestLoginOptions, verifyLogin } from '../lib/api';
import { startPasskeyAuthentication, decodeBase64UrlToString } from '../lib/webauthn';
import type { InspectPacket, User } from '../lib/types';

interface LoginTabProps {
  onLoginSuccess: (user: User) => void;
  onAddInspectPacket: (packet: InspectPacket) => void;
  onNavigateToRegister: () => void;
  currentUser: User | null;
  isBackendOnline: boolean;
}

export const LoginTab = ({
  onLoginSuccess,
  onAddInspectPacket,
  onNavigateToRegister,
  currentUser,
}: LoginTabProps) => {
  const [studentCode, setStudentCode] = useState(currentUser?.studentCode || '');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handlePasskeyLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      // BƯỚC 1: Lấy Challenge từ Server
      const sCode = studentCode.trim().toUpperCase();
      const optionsRes = await requestLoginOptions(sCode ? { studentCode: sCode } : undefined);

      if (!optionsRes.isSuccess || !optionsRes.value) {
        // Backend chưa có endpoint login/options (do bạn nhóm mới code xong register)
        if (optionsRes.error?.code?.includes('404') || optionsRes.error?.message?.includes('404')) {
          setInfoMessage(
            'Backend hiện tại đã triển khai xong 100% chức năng ĐĂNG KÝ PASSKEY (POST /api/v1/auth/register/options & verify). Endpoint ĐĂNG NHẬP (POST /api/v1/auth/login) đang trong lộ trình phát triển tiếp theo.'
          );
          return;
        }
        throw new Error(optionsRes.error?.message || 'Không thể lấy thông tin đăng nhập từ máy chủ.');
      }

      const { ceremonyId, options } = optionsRes.value;

      onAddInspectPacket({
        id: `pkt-${Date.now()}-login-1`,
        title: 'Bước 1: Server -> Client (Login Options)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'login',
        phase: 'Server Options',
        data: { ceremonyId, options },
        notes: 'Server gửi Challenge một lần và yêu cầu userVerification=required.',
      });

      // BƯỚC 2: Gọi WebAuthn Authenticator (Vân tay / Touch ID / Windows Hello)
      const credential = await startPasskeyAuthentication(options);

      let decodedClientData = null;
      try {
        if (credential.response?.clientDataJSON) {
          decodedClientData = JSON.parse(decodeBase64UrlToString(credential.response.clientDataJSON));
        }
      } catch {
        // fallback
      }

      onAddInspectPacket({
        id: `pkt-${Date.now()}-login-2`,
        title: 'Bước 2: Authenticator -> Client (Assertion Signature)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'login',
        phase: 'Client Authenticator',
        data: { credential, decodedClientData },
        notes: 'Thiết bị ký số lên challenge bằng Private Key an toàn và gửi Assertion lên server.',
      });

      // BƯỚC 3: Gửi Assertion lên server xác thực
      const verifyRes = await verifyLogin({ ceremonyId, credential });

      if (!verifyRes.isSuccess || !verifyRes.value) {
        throw new Error(verifyRes.error?.message || 'Xác thực chữ ký đăng nhập không thành công.');
      }

      onAddInspectPacket({
        id: `pkt-${Date.now()}-login-3`,
        title: 'Bước 3: Server Verify Login Success (+ Set-Cookie)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'login',
        phase: 'Server Verify Result',
        data: verifyRes.value,
        notes: 'Chữ ký hợp lệ. Server cấp cookie đăng nhập và cấp quyền truy cập cổng sinh viên.',
      });

      onLoginSuccess(verifyRes.value.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đã có lỗi xảy ra khi đăng nhập bằng Passkey.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
        {/* Header Icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/10">
            <Fingerprint className="w-9 h-9 stroke-[2.2]" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Đăng Nhập Bằng Passkey</h2>
          <p className="text-xs text-slate-400 mt-1">
            Không cần nhớ mật khẩu. Xác thực tức thì bằng vân tay, Touch ID hoặc Windows Hello.
          </p>
        </div>

        {/* Current user session banner */}
        {currentUser && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-emerald-400 font-semibold">Tài khoản vừa tạo thành công:</span>
                <div className="text-white font-bold text-sm mt-0.5">
                  {currentUser.fullName} ({currentUser.studentCode})
                </div>
              </div>
              <button
                onClick={() => onLoginSuccess(currentUser)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center space-x-1"
              >
                <span>Vào Cổng</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-indigo-200 text-xs flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-indigo-300">Thông báo tiến độ dự án</div>
              <div className="mt-1 leading-relaxed">{infoMessage}</div>
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="mt-2.5 inline-flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-bold underline underline-offset-2"
              >
                <span>Chuyển sang Tab Đăng Ký Passkey để kiểm tra ngay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-rose-200">Đăng nhập không thành công</div>
              <div className="mt-0.5">{errorMessage}</div>
            </div>
          </div>
        )}

        {/* Action 1: One-Touch Passkey Login */}
        <div className="space-y-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => handlePasskeyLogin()}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm sm:text-base transition-all duration-200 shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang kết nối cảm biến sinh trắc học...</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5 stroke-[2.2]" />
                <span>Đăng Nhập Một Chạm Bằng Passkey</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900 px-3 text-slate-500 font-medium">HOẶC ĐIỀN MSSV CỤ THỂ</span>
            </div>
          </div>

          {/* Action 2: Enter Student Code & Authenticate */}
          <form onSubmit={handlePasskeyLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mã số sinh viên (MSSV)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                  placeholder="VD: SV001"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !studentCode.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm border border-slate-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Xác thực Passkey cho MSSV này</span>
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <span>Chưa có Passkey sinh trắc học?</span>
          <button
            onClick={onNavigateToRegister}
            className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2"
          >
            Đăng ký tạo tài khoản mới
          </button>
        </div>

        {/* Security Feature Highlights */}
        <div className="mt-5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tiêu chuẩn bảo mật W3C WebAuthn:</span>
          </div>
          <p>
            • Không gửi mật khẩu qua mạng Internet - Chống tấn công Phishing (trang web giả mạo) nhờ kiểm tra RP ID.
          </p>
          <p>
            • Chữ ký số ES256 được kiểm tra qua hàm <code>Fido2.MakeAssertionAsync</code> ở phía máy chủ C#.
          </p>
        </div>
      </div>
    </div>
  );
};
