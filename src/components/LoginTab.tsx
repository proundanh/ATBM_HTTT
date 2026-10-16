import { useState, type FormEvent } from 'react';
import {
  Fingerprint,
  User as UserIcon,
  Shield,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info,
  Key,
  ShieldAlert,
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
            'Không thể lấy thông tin đăng nhập từ máy chủ. Hãy kiểm tra kết nối Backend.'
        );
      }

      const { ceremonyId, options } = optionsRes.value;

      onAddInspectPacket({
        id: `pkt-${Date.now()}-login-1`,
        title: 'Bước 1: Server -> Client (Login Assertion Options)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'login',
        phase: 'Server Options',
        data: { ceremonyId, options },
        notes: `Server sinh Challenge một lần (TTL 120s) và yêu cầu userVerification=required. Số lượng allowedCredentials: ${
          options.allowCredentials?.length || 0
        }.`,
      });

      // BƯỚC 2: Gọi WebAuthn Authenticator (Vân tay / Touch ID / Windows Hello)
      setCurrentStep(2);
      setStepMessage('Vui lòng chạm cảm biến sinh trắc học (vân tay / Touch ID / Windows Hello / PIN) trên thiết bị...');

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
        title: 'Bước 2: Authenticator -> Client (Assertion Signature & UserHandle)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'login',
        phase: 'Client Authenticator',
        data: { credential, decodedClientData },
        notes:
          'Khóa riêng bí mật trong TPM đã ký số lên Challenge. Dữ liệu bao gồm chữ ký số ECDSA (P-256) và userHandle định danh sinh viên.',
      });

      // BƯỚC 3: Gửi Assertion lên Backend C# để xác thực chữ ký & cấp Cookie
      setCurrentStep(3);
      setStepMessage('Đang xác minh chữ ký số FIDO2 và kiểm tra bộ đếm chống sao chép khóa...');

      const verifyRes = await verifyLogin({ ceremonyId, credential });

      if (!verifyRes.isSuccess || !verifyRes.value) {
        const code = verifyRes.error?.code || 'AUTH_FAILED';
        setErrorCode(code);
        throw new Error(verifyRes.error?.message || 'Xác thực chữ ký số đăng nhập không thành công.');
      }

      onAddInspectPacket({
        id: `pkt-${Date.now()}-login-3`,
        title: 'Bước 3: Server Verify Success (+ Cấp Cookie StudentPortal.Auth)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'login',
        phase: 'Server Verify Result',
        data: verifyRes.value,
        notes:
          'Server Fido2.MakeAssertionAsync thành công! Tăng SignatureCounter và thiết lập Cookie phiên làm việc HttpOnly an toàn.',
      });

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
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6">
      {/* Backend Offline Warning */}
      {!isBackendOnline && (
        <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Lưu ý:</strong> Chưa kết nối được Backend C# tại <code>http://localhost:5105</code>. Vui lòng chạy{' '}
            <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">dotnet run</code> trong thư mục backend.
          </span>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-6 sm:p-7">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto mb-3">
            <Fingerprint className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Đăng Nhập Bằng Passkey</h2>
          <p className="text-xs text-gray-500 mt-1">
            Không cần nhập mật khẩu • Xác thực một chạm bằng sinh trắc học
          </p>
        </div>

        {/* Existing active user session notification */}
        {currentUser && (
          <div className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-emerald-800 font-medium">Tài khoản đang đăng nhập:</span>
                  <div className="text-gray-900 font-bold">
                    {currentUser.fullName} ({currentUser.studentCode})
                  </div>
                </div>
              </div>
              <button
                onClick={() => onLoginSuccess(currentUser)}
                className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center space-x-1 transition-colors"
              >
                <span>Vào Cổng</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-rose-900 flex items-center justify-between">
                <span>Đăng nhập thất bại</span>
                {errorCode && (
                  <span className="font-mono text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded border border-rose-200">
                    {errorCode}
                  </span>
                )}
              </div>
              <div className="mt-1 leading-relaxed">{errorMessage}</div>
              {errorCode === 'COUNTER_ROLLBACK' && (
                <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                  <ShieldAlert className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
                  <strong>Cơ chế an ninh FIDO2:</strong> Bộ đếm chữ ký bị giảm so với lần trước. Hệ thống đã chặn đăng nhập để chống nhân bản khóa!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 mb-5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setLoginMode('one-touch')}
            className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center space-x-1.5 ${
              loginMode === 'one-touch'
                ? 'bg-white text-gray-900 shadow-xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Đăng nhập một chạm</span>
          </button>

          <button
            type="button"
            onClick={() => setLoginMode('student-code')}
            className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center space-x-1.5 ${
              loginMode === 'student-code'
                ? 'bg-white text-gray-900 shadow-xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Nhập MSSV</span>
          </button>
        </div>

        {/* Stepper info during loading */}
        {loading && (
          <div className="mb-5 p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs">
            <div className="flex items-center space-x-2.5 mb-2.5">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
              <span className="text-blue-900 font-medium">{stepMessage}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div
                className={`p-1.5 rounded border ${
                  currentStep >= 1 ? 'border-blue-400 bg-white text-blue-800 font-semibold' : 'border-gray-200 text-gray-400'
                }`}
              >
                1. Challenge
              </div>
              <div
                className={`p-1.5 rounded border ${
                  currentStep >= 2 ? 'border-blue-400 bg-white text-blue-800 font-semibold' : 'border-gray-200 text-gray-400'
                }`}
              >
                2. Chạm Vân Tay
              </div>
              <div
                className={`p-1.5 rounded border ${
                  currentStep >= 3 ? 'border-blue-400 bg-white text-blue-800 font-semibold' : 'border-gray-200 text-gray-400'
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
            <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600 leading-relaxed text-center">
              Trình duyệt sẽ tự động nhận diện khóa bảo mật đã lưu trên thiết bị của bạn. Chỉ cần chạm cảm biến vân tay hoặc quét mã PIN là đăng nhập thành công.
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => handlePasskeyLogin(undefined, 'one-touch')}
              className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang kết nối cảm biến bảo mật...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
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
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Mã số sinh viên (MSSV) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                  placeholder="VD: SV001"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !studentCode.trim()}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực Passkey...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Xác Thực Passkey Cho MSSV Này</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
          <span>Chưa có Passkey trên thiết bị này?</span>
          <button
            onClick={onNavigateToRegister}
            className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
          >
            Đăng ký tài khoản mới
          </button>
        </div>

        {/* Security Feature Highlights */}
        <div className="mt-5 p-3 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-600 space-y-1">
          <div className="flex items-center space-x-1.5 text-gray-900 font-semibold">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Tiêu chuẩn bảo mật W3C WebAuthn:</span>
          </div>
          <p>
            • Không truyền mật khẩu qua mạng Internet - Chống Phishing nhờ kiểm tra RP ID <code>localhost</code>.
          </p>
          <p>
            • Chữ ký số ES256 được kiểm tra qua <code>Fido2.MakeAssertionAsync</code> ở phía máy chủ C#.
          </p>
        </div>
      </div>
    </div>
  );
};
