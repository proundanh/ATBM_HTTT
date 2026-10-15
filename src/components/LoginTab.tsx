import { useState, type FormEvent } from 'react';
import {
  Fingerprint,
  User as UserIcon,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info,
  Key,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
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
  isBackendOnline,
}: LoginTabProps) => {
  const [studentCode, setStudentCode] = useState(currentUser?.studentCode || '');
  const [loginMode, setLoginMode] = useState<'one-touch' | 'student-code'>('one-touch');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [stepMessage, setStepMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const handlePasskeyLogin = async (e?: FormEvent, forceMode?: 'one-touch' | 'student-code') => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);
    setLoading(true);

    const mode = forceMode || loginMode;
    const sCode = mode === 'student-code' ? studentCode.trim().toUpperCase() : undefined;

    try {
      // BƯỚC 1: Lấy Challenge & AssertionOptions từ Server C#
      setCurrentStep(1);
      setStepMessage(
        sCode
          ? `Đang lấy Challenge & khóa ủy quyền cho sinh viên ${sCode}...`
          : 'Đang yêu cầu máy chủ cấp Challenge đăng nhập một chạm (Discoverable Passkey)...'
      );

      const optionsRes = await requestLoginOptions(sCode ? { studentCode: sCode } : undefined);

      if (!optionsRes.isSuccess || !optionsRes.value) {
        throw new Error(
          optionsRes.error?.message ||
            'Không thể lấy thông tin đăng nhập từ máy chủ. Hãy kiểm tra xem backend .NET đã khởi động chưa.'
        );
      }

      const { ceremonyId, options } = optionsRes.value;

      // Ghi nhận gói tin 1 vào Inspect Data
      onAddInspectPacket({
        id: `pkt-${Date.now()}-login-1`,
        title: 'Bước 1: Server -> Client (Login Assertion Options)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'login',
        phase: 'Server Options',
        data: {
          ceremonyId,
          options,
        },
        notes: `Server sinh ra Challenge một lần (TTL 120s) và yêu cầu userVerification=required. Số lượng allowedCredentials gửi về: ${
          options.allowCredentials?.length || 0
        }.`,
      });

      // BƯỚC 2: Gọi WebAuthn Authenticator (Vân tay / Touch ID / Windows Hello)
      setCurrentStep(2);
      setStepMessage('Vui lòng chạm cảm biến sinh trắc học (vân tay / Face ID / Windows Hello / PIN) trên thiết bị...');

      const credential = await startPasskeyAuthentication(options);

      // Giải mã clientDataJSON để hiển thị chi tiết trong Inspect
      let decodedClientData = null;
      try {
        if (credential.response?.clientDataJSON) {
          decodedClientData = JSON.parse(decodeBase64UrlToString(credential.response.clientDataJSON));
        }
      } catch {
        // fallback
      }

      // Ghi nhận gói tin 2 vào Inspect Data
      onAddInspectPacket({
        id: `pkt-${Date.now()}-login-2`,
        title: 'Bước 2: Authenticator -> Client (Assertion Signature & UserHandle)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'login',
        phase: 'Client Authenticator',
        data: {
          credential,
          decodedClientData,
        },
        notes:
          'Khóa riêng bí mật (Private Key) trong TPM đã ký số lên Challenge. Dữ liệu bao gồm chữ ký số ECDSA (P-256) và userHandle định danh sinh viên.',
      });

      // BƯỚC 3: Gửi Assertion lên Backend C# để xác thực chữ ký & cấp Cookie
      setCurrentStep(3);
      setStepMessage('Đang xác minh chữ ký số FIDO2 và kiểm tra chống sao chép khóa (Signature Counter)...');

      const verifyRes = await verifyLogin({ ceremonyId, credential });

      if (!verifyRes.isSuccess || !verifyRes.value) {
        const code = verifyRes.error?.code || 'AUTH_FAILED';
        setErrorCode(code);
        throw new Error(verifyRes.error?.message || 'Xác thực chữ ký số đăng nhập không thành công.');
      }

      // Ghi nhận gói tin 3 vào Inspect Data
      onAddInspectPacket({
        id: `pkt-${Date.now()}-login-3`,
        title: 'Bước 3: Server Verify Success (+ Cấp Cookie StudentPortal.Auth)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'login',
        phase: 'Server Verify Result',
        data: verifyRes.value,
        notes:
          'Server Fido2.MakeAssertionAsync thành công! Đã tăng bộ đếm chữ ký SignatureCounter và cấp Cookie phiên làm việc HttpOnly an toàn.',
      });

      // Đăng nhập thành công, chuyển hướng vào Dashboard
      onLoginSuccess(verifyRes.value.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đã có lỗi xảy ra trong quá trình đăng nhập Passkey.');
    } finally {
      setLoading(false);
      setCurrentStep(0);
      setStepMessage('');
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 sm:px-6">
      {/* Backend Offline Warning */}
      {!isBackendOnline && (
        <div className="mb-6 p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-center space-x-2.5 shadow-lg">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Lưu ý:</strong> Chưa kết nối được Backend C# tại <code>http://localhost:5105</code>. Vui lòng chạy{' '}
            <code className="bg-amber-900/40 px-1 py-0.5 rounded text-amber-300">dotnet run</code> trong thư mục backend.
          </span>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="relative inline-block mx-auto mb-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Fingerprint className="w-9 h-9 stroke-[2.2]" />
            </div>
            <Sparkles className="w-4 h-4 text-emerald-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Đăng Nhập Bằng Passkey</h2>
          <p className="text-xs text-slate-400 mt-1">
            Không mật khẩu • Xác thực một chạm trong 1 giây • Miễn nhiễm Phishing 100%
          </p>
        </div>

        {/* Existing active user session notification */}
        {currentUser && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-emerald-400 font-semibold">Tài khoản sinh viên đang hoạt động:</span>
                  <div className="text-white font-bold text-sm">
                    {currentUser.fullName} ({currentUser.studentCode})
                  </div>
                </div>
              </div>
              <button
                onClick={() => onLoginSuccess(currentUser)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1 transition-colors shadow-md shadow-emerald-500/20"
              >
                <span>Vào Cổng</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-rose-200 flex items-center justify-between">
                <span>Đăng nhập thất bại</span>
                {errorCode && (
                  <span className="font-mono text-[10px] bg-rose-900/40 text-rose-300 px-1.5 py-0.5 rounded border border-rose-700/40">
                    {errorCode}
                  </span>
                )}
              </div>
              <div className="mt-1 leading-relaxed">{errorMessage}</div>
              {errorCode === 'COUNTER_ROLLBACK' && (
                <div className="mt-2 text-[11px] text-amber-300 bg-amber-950/30 p-2 rounded-lg border border-amber-500/20">
                  <ShieldAlert className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                  <strong>Cơ chế an ninh FIDO2:</strong> Bộ đếm chữ ký bị giảm so với lần trước. Hệ thống đã chặn đăng nhập để chống kẻ gian sao chép (clone) thiết bị khóa!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-950/70 p-1 rounded-xl border border-slate-800 mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setLoginMode('one-touch')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
              loginMode === 'one-touch'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Fingerprint className="w-4 h-4" />
            <span>Đăng nhập một chạm</span>
          </button>

          <button
            type="button"
            onClick={() => setLoginMode('student-code')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
              loginMode === 'student-code'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Nhập MSSV</span>
          </button>
        </div>

        {/* Stepper info during loading */}
        {loading && (
          <div className="mb-6 p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-xs">
            <div className="flex items-center space-x-3 mb-3">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
              <span className="text-emerald-300 font-semibold">{stepMessage}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div
                className={`p-2 rounded-lg border ${
                  currentStep >= 1
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                    : 'border-slate-800 text-slate-600'
                }`}
              >
                1. Challenge
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  currentStep >= 2
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                    : 'border-slate-800 text-slate-600'
                }`}
              >
                2. Chạm Vân Tay
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  currentStep >= 3
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                    : 'border-slate-800 text-slate-600'
                }`}
              >
                3. Cấp Phiên
              </div>
            </div>
          </div>
        )}

        {/* MODE 1: ONE-TOUCH PASSKEY LOGIN */}
        {loginMode === 'one-touch' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs text-slate-300 leading-relaxed text-center">
              Trình duyệt sẽ tự động nhận diện khóa bảo mật đã lưu trên thiết bị của bạn. Chỉ cần chạm cảm biến vân tay hoặc quét mã PIN là đăng nhập thành công.
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => handlePasskeyLogin(undefined, 'one-touch')}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm sm:text-base transition-all duration-200 shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang giao tiếp với cảm biến bảo mật...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5 stroke-[2.3]" />
                  <span>Chạm Vân Tay / Passkey Để Đăng Nhập</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* MODE 2: LOGIN WITH STUDENT CODE */}
        {loginMode === 'student-code' && (
          <form onSubmit={(e) => handlePasskeyLogin(e, 'student-code')} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mã số sinh viên (MSSV) <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                  placeholder="VD: SV001"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Server sẽ lọc đúng danh sách khóa bảo mật của sinh viên này
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !studentCode.trim()}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm sm:text-base transition-all duration-200 shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang xác thực Passkey...</span>
                </>
              ) : (
                <>
                  <Key className="w-5 h-5 text-slate-950" />
                  <span>Xác Thực Passkey Cho MSSV Này</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <span>Chưa có Passkey trên thiết bị này?</span>
          <button
            onClick={onNavigateToRegister}
            className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2"
          >
            Đăng ký tài khoản sinh viên mới
          </button>
        </div>

        {/* Security Feature Highlights */}
        <div className="mt-5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tiêu chuẩn bảo mật W3C WebAuthn:</span>
          </div>
          <p>
            • Không truyền mật khẩu qua mạng Internet - Chống tấn công Phishing nhờ kiểm tra RP ID <code>localhost</code>.
          </p>
          <p>
            • Chữ ký số ES256 được kiểm tra qua hàm <code>Fido2.MakeAssertionAsync</code> ở phía máy chủ C#.
          </p>
        </div>
      </div>
    </div>
  );
};
