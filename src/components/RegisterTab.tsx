import { useState, useEffect, type FormEvent } from 'react';
import {
  Fingerprint,
  User as UserIcon,
  Mail,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { requestRegisterOptions, verifyRegister } from '../lib/api';
import {
  startPasskeyRegistration,
  getDefaultDeviceName,
  checkDevicePasskeyCapability,
  decodeBase64UrlToString,
} from '../lib/webauthn';
import type { InspectPacket, User, CredentialDto } from '../lib/types';

interface RegisterTabProps {
  onRegisterSuccess: (user: User, credential: CredentialDto) => void;
  onAddInspectPacket: (packet: InspectPacket) => void;
  onNavigateToLogin: () => void;
  onNavigateToDashboard?: () => void;
  isBackendOnline: boolean;
}

export const RegisterTab = ({
  onRegisterSuccess,
  onAddInspectPacket,
  onNavigateToLogin,
  onNavigateToDashboard,
  isBackendOnline,
}: RegisterTabProps) => {
  const [studentCode, setStudentCode] = useState('SV001');
  const [fullName, setFullName] = useState('Nguyễn Văn A');
  const [email, setEmail] = useState('sv001@school.edu.vn');
  const [deviceName, setDeviceName] = useState('');

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [stepMessage, setStepMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [deviceCapability, setDeviceCapability] = useState<{
    supported: boolean;
    hasPlatformAuthenticator: boolean;
    summary: string;
  } | null>(null);

  const [registeredResult, setRegisteredResult] = useState<{
    user: User;
    credential: CredentialDto;
  } | null>(null);

  useEffect(() => {
    setDeviceName(getDefaultDeviceName());
    checkDevicePasskeyCapability().then(setDeviceCapability);
  }, []);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setRegisteredResult(null);

    const sCode = studentCode.trim().toUpperCase();
    const fName = fullName.trim();
    const mail = email.trim().toLowerCase();
    const dName = deviceName.trim() || getDefaultDeviceName();

    if (!sCode || !fName || !mail) {
      setErrorMessage('Vui lòng điền đầy đủ Mã số sinh viên, Họ tên và Email.');
      return;
    }

    setLoading(true);

    try {
      // BƯỚC 1: Lấy Challenge & Options từ Backend C#
      setCurrentStep(1);
      setStepMessage('Đang yêu cầu máy chủ sinh Challenge bảo mật một lần (TTL: 120s)...');

      const optionsRes = await requestRegisterOptions({
        studentCode: sCode,
        fullName: fName,
        email: mail,
      });

      if (!optionsRes.isSuccess || !optionsRes.value) {
        throw new Error(
          optionsRes.error?.message ||
            'Không thể lấy thông tin đăng ký từ máy chủ. Hãy kiểm tra lại kết nối Backend.'
        );
      }

      const { ceremonyId, options } = optionsRes.value;

      // Ghi nhận gói tin 1 vào Inspect Data
      onAddInspectPacket({
        id: `pkt-${Date.now()}-1`,
        title: 'Bước 1: Server -> Client (Register Options)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'register',
        phase: 'Server Options',
        data: {
          ceremonyId,
          options,
        },
        notes:
          'Máy chủ Fido2-net-lib sinh ra Challenge ngẫu nhiên chống tấn công Replay và cấu hình residentKey=required để hỗ trợ Passkey một chạm.',
      });

      // BƯỚC 2: Gọi WebAuthn Browser API (Cảm biến sinh trắc học thiết bị)
      setCurrentStep(2);
      setStepMessage('Vui lòng chạm cảm biến vân tay (Touch ID / Windows Hello / Face ID / PIN) trên thiết bị...');

      const credential = await startPasskeyRegistration(options);

      // Giải mã clientDataJSON để hiển thị rõ ràng trong Inspect
      let decodedClientData = null;
      try {
        if (credential.response?.clientDataJSON) {
          decodedClientData = JSON.parse(
            decodeBase64UrlToString(credential.response.clientDataJSON)
          );
        }
      } catch {
        // fallback
      }

      // Ghi nhận gói tin 2 vào Inspect Data
      onAddInspectPacket({
        id: `pkt-${Date.now()}-2`,
        title: 'Bước 2: Client Authenticator -> Browser (Attestation Credential)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'register',
        phase: 'Client Authenticator',
        data: {
          credential,
          decodedClientData,
        },
        notes:
          'Thiết bị đã sinh cặp khóa (ES256 ECDSA P-256). Khóa riêng (Private Key) được giữ an toàn trong TPM/Secure Enclave. Khóa công khai (Public Key) đóng gói trong attestationObject gửi lên server.',
      });

      // BƯỚC 3: Gửi Credential lên Backend để xác minh chữ ký & lưu Public Key
      setCurrentStep(3);
      setStepMessage('Đang gửi chữ ký và khóa công khai lên máy chủ để xác thực và tạo tài khoản...');

      const verifyRes = await verifyRegister({
        ceremonyId,
        deviceName: dName,
        credential,
      });

      if (!verifyRes.isSuccess || !verifyRes.value) {
        throw new Error(
          verifyRes.error?.message ||
            'Xác thực thông tin Passkey thất bại. Vui lòng thử lại.'
        );
      }

      // Ghi nhận gói tin 3 vào Inspect Data
      onAddInspectPacket({
        id: `pkt-${Date.now()}-3`,
        title: 'Bước 3: Server Verify Success (+ Cấp Cookie Session)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'register',
        phase: 'Server Verify Result',
        data: verifyRes.value,
        notes:
          'Server đã xác minh chữ ký FIDO2 thành công, lưu Public Key vào bảng StoredCredentials (không lưu mật khẩu!) và thiết lập Cookie xác thực HttpOnly StudentPortal.Auth.',
      });

      setRegisteredResult(verifyRes.value);
      onRegisterSuccess(verifyRes.value.user, verifyRes.value.credential);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đã có lỗi xảy ra trong quá trình đăng ký Passkey.');
    } finally {
      setLoading(false);
      setCurrentStep(0);
      setStepMessage('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Banner Notice */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/20 shadow-lg">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/30 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <span>Đăng Ký Tài Khoản Không Dùng Mật Khẩu (Passwordless)</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30">
                ES256 / FIDO2
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Hệ thống tạo cặp khóa mật mã học <strong>Public/Private Key</strong> trực tiếp trên thiết bị của bạn.
              Khóa bí mật được lưu trong chip bảo mật <strong>TPM / Secure Enclave</strong> và không bao giờ rời khỏi máy.
              Cơ sở dữ liệu của trường học <strong>hoàn toàn không có cột Password</strong>, loại bỏ 100% rủi ro lộ lọt mật khẩu.
            </p>
            {deviceCapability && (
              <div className="mt-2.5 flex items-center space-x-2 text-xs text-emerald-400/90 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{deviceCapability.summary}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isBackendOnline && (
        <div className="mb-6 p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-center space-x-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Lưu ý:</strong> Máy chủ Backend (.NET) chưa khởi động ở cổng <code>5105</code>. Bạn hãy chạy{' '}
            <code className="bg-amber-900/40 px-1 py-0.5 rounded text-amber-300">dotnet run</code> trong thư mục backend để API xử lý xác thực FIDO2.
          </span>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
        {registeredResult ? (
          /* SUCCESS VIEW */
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-3">
              Tạo Passkey Thành Công
            </span>

            <h2 className="text-xl font-bold text-white mb-2">
              Chào mừng, {registeredResult.user.fullName}!
            </h2>

            <p className="text-sm text-slate-300 max-w-lg mx-auto mb-6">
              Tài khoản sinh viên <strong>{registeredResult.user.studentCode}</strong> đã được liên kết với khóa sinh trắc học trên thiết bị của bạn.
            </p>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 max-w-lg mx-auto text-left mb-6 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Mã số sinh viên:</span>
                <span className="text-emerald-400 font-bold">{registeredResult.user.studentCode}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Thiết bị bảo mật:</span>
                <span className="text-slate-200">{registeredResult.credential.deviceName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Credential ID:</span>
                <span className="text-slate-300 truncate max-w-[240px]">{registeredResult.credential.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cơ chế bảo vệ:</span>
                <span className="text-teal-400 font-semibold">WebAuthn ES256 (P-256 + SHA256)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
              {onNavigateToDashboard && (
                <button
                  onClick={onNavigateToDashboard}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2"
                >
                  <span>Vào Cổng Sinh Viên Ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onNavigateToLogin}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all flex items-center justify-center space-x-2 border border-slate-700"
              >
                <span>Thử Đăng Nhập Lại</span>
              </button>

              <button
                onClick={() => setRegisteredResult(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 text-sm font-medium transition-all"
              >
                Đăng ký tài khoản khác
              </button>
            </div>
          </div>
        ) : (
          /* FORM VIEW */
          <form onSubmit={handleRegister} className="p-6 sm:p-8">
            <div className="border-b border-slate-800 pb-5 mb-6">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Fingerprint className="w-5 h-5 text-emerald-400" />
                <span>Thông Tin Sinh Viên & Khởi Tạo Passkey</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Điền thông tin định danh sinh viên để kích hoạt cảm biến vân tay / khuôn mặt trên máy tính hoặc điện thoại.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-rose-200">Đăng ký không thành công</div>
                  <div className="mt-0.5">{errorMessage}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              {/* MSSV */}
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
                <span className="text-[11px] text-slate-500 mt-1 block">Mã định danh duy nhất của sinh viên</span>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Họ và tên <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email sinh viên <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: sv001@school.edu.vn"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Device Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tên thiết bị liên kết Passkey
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="VD: Windows Hello (Laptop)"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Tên hiển thị trong danh sách thiết bị tin cậy</span>
              </div>
            </div>

            {/* Stepper info during loading */}
            {loading && (
              <div className="mb-6 p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-xs">
                <div className="flex items-center space-x-3 mb-3">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
                  <span className="text-emerald-300 font-semibold">{stepMessage}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className={`p-2 rounded-lg border ${currentStep >= 1 ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold' : 'border-slate-800 text-slate-600'}`}>
                    1. Challenge Options
                  </div>
                  <div className={`p-2 rounded-lg border ${currentStep >= 2 ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold' : 'border-slate-800 text-slate-600'}`}>
                    2. Chạm Sinh Trắc Học
                  </div>
                  <div className={`p-2 rounded-lg border ${currentStep >= 3 ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold' : 'border-slate-800 text-slate-600'}`}>
                    3. Lưu Public Key
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm sm:text-base transition-all duration-200 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang kết nối cảm biến sinh trắc học...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5 stroke-[2.2]" />
                  <span>Tạo Tài Khoản & Kích Hoạt Passkey</span>
                </>
              )}
            </button>

            <div className="mt-4 text-center">
              <span className="text-xs text-slate-400">Đã có tài khoản Passkey trên thiết bị này? </span>
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 ml-1"
              >
                Chuyển sang Đăng nhập ngay
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
