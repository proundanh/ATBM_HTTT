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
      setStepMessage('Đang yêu cầu máy chủ sinh Challenge bảo mật (TTL: 120s)...');

      const optionsRes = await requestRegisterOptions({
        studentCode: sCode,
        fullName: fName,
        email: mail,
      });

      if (!optionsRes.isSuccess || !optionsRes.value) {
        throw new Error(
          optionsRes.error?.message ||
            'Không thể lấy thông tin đăng ký từ máy chủ. Hãy kiểm tra kết nối Backend.'
        );
      }

      const { ceremonyId, options } = optionsRes.value;

      onAddInspectPacket({
        id: `pkt-${Date.now()}-reg-1`,
        title: 'Bước 1: Server -> Client (Register Options)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'register',
        phase: 'Server Options',
        data: { ceremonyId, options },
        notes:
          'Máy chủ Fido2-net-lib sinh Challenge ngẫu nhiên chống tấn công Replay và cấu hình residentKey=required.',
      });

      // BƯỚC 2: Gọi WebAuthn Browser API (Cảm biến sinh trắc học thiết bị)
      setCurrentStep(2);
      setStepMessage('Vui lòng chạm cảm biến vân tay (Touch ID / Windows Hello / Face ID / PIN) trên thiết bị...');

      const credential = await startPasskeyRegistration(options);

      let decodedClientData = null;
      try {
        if (credential.response?.clientDataJSON) {
          decodedClientData = JSON.parse(decodeBase64UrlToString(credential.response.clientDataJSON));
        }
      } catch {
        // fallback
      }

      onAddInspectPacket({
        id: `pkt-${Date.now()}-reg-2`,
        title: 'Bước 2: Authenticator -> Client (Attestation Credential)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'register',
        phase: 'Client Authenticator',
        data: { credential, decodedClientData },
        notes:
          'Thiết bị đã sinh cặp khóa (ES256 ECDSA P-256). Khóa riêng (Private Key) được giữ trong TPM/Secure Enclave. Khóa công khai đóng gói trong attestationObject gửi lên server.',
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
        throw new Error(verifyRes.error?.message || 'Xác thực thông tin Passkey thất bại.');
      }

      onAddInspectPacket({
        id: `pkt-${Date.now()}-reg-3`,
        title: 'Bước 3: Server Verify Success (+ Cấp Cookie Session)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'register',
        phase: 'Server Verify Result',
        data: verifyRes.value,
        notes:
          'Server đã xác minh chữ ký FIDO2 thành công, lưu Public Key vào bảng StoredCredentials (không lưu mật khẩu!) và cấp Cookie xác thực StudentPortal.Auth.',
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
    <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6">
      {/* Informative Header Banner */}
      <div className="mb-6 p-4 rounded-xl bg-white border border-gray-200 shadow-xs">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
              <span>Đăng Ký Tài Khoản Bằng Passkey (Không Mật Khẩu)</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-mono border border-blue-200">
                ES256 / FIDO2
              </span>
            </h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Khóa bí mật được tạo và lưu trực tiếp trong chip phần cứng an toàn <strong>TPM / Secure Enclave</strong> trên thiết bị của bạn.
              Cơ sở dữ liệu nhà trường <strong>hoàn toàn không lưu mật khẩu</strong>, triệt tiêu 100% rủi ro bị lộ mật khẩu hay phishing.
            </p>
            {deviceCapability && (
              <div className="mt-2 text-xs text-emerald-700 font-medium flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{deviceCapability.summary}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isBackendOnline && (
        <div className="mb-6 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Lưu ý:</strong> Máy chủ Backend (.NET) chưa khởi động ở cổng <code>5105</code>. Vui lòng chạy{' '}
            <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">dotnet run</code> trong thư mục backend.
          </span>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        {registeredResult ? (
          /* SUCCESS VIEW */
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
              Đăng Ký Passkey Thành Công
            </span>

            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Chào mừng, {registeredResult.user.fullName}!
            </h2>

            <p className="text-xs text-gray-600 max-w-md mx-auto mb-6 leading-relaxed">
              Tài khoản <strong>{registeredResult.user.studentCode}</strong> đã được bảo vệ bằng chuẩn bảo mật W3C WebAuthn trên thiết bị này.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-md mx-auto text-left mb-6 space-y-2 text-xs">
              <div className="flex justify-between border-b border-gray-200 pb-1.5">
                <span className="text-gray-500">Mã số sinh viên:</span>
                <span className="text-gray-900 font-mono font-semibold">{registeredResult.user.studentCode}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1.5">
                <span className="text-gray-500">Thiết bị liên kết:</span>
                <span className="text-gray-900">{registeredResult.credential.deviceName}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1.5">
                <span className="text-gray-500">Credential ID:</span>
                <span className="text-gray-600 font-mono text-[11px] truncate max-w-[220px]">{registeredResult.credential.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cơ chế xác thực:</span>
                <span className="text-blue-700 font-medium">ES256 (ECDSA P-256 + SHA-256)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-2.5">
              {onNavigateToDashboard && (
                <button
                  onClick={onNavigateToDashboard}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <span>Vào Cổng Sinh Viên</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={onNavigateToLogin}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium text-xs transition-colors"
              >
                <span>Thử Đăng Nhập Lại</span>
              </button>

              <button
                onClick={() => setRegisteredResult(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-gray-500 hover:text-gray-800 text-xs transition-colors"
              >
                Đăng ký tài khoản khác
              </button>
            </div>
          </div>
        ) : (
          /* FORM VIEW */
          <form onSubmit={handleRegister} className="p-6 sm:p-7">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                <Fingerprint className="w-5 h-5 text-blue-600" />
                <span>Thông Tin Sinh Viên & Khởi Tạo Khóa</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Điền thông tin định danh sinh viên để kích hoạt cảm biến sinh trắc học trên thiết bị này.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-rose-900">Đăng ký không thành công</div>
                  <div className="mt-0.5">{errorMessage}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {/* MSSV */}
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

              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Email sinh viên <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: sv001@school.edu.vn"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              {/* Device Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Tên thiết bị liên kết Passkey
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="VD: Windows Hello (Laptop)"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Stepper info during loading */}
            {loading && (
              <div className="mb-5 p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs">
                <div className="flex items-center space-x-2.5 mb-2.5">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                  <span className="text-blue-900 font-medium">{stepMessage}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className={`p-1.5 rounded border ${currentStep >= 1 ? 'border-blue-400 bg-white text-blue-800 font-semibold' : 'border-gray-200 text-gray-400'}`}>
                    1. Challenge Options
                  </div>
                  <div className={`p-1.5 rounded border ${currentStep >= 2 ? 'border-blue-400 bg-white text-blue-800 font-semibold' : 'border-gray-200 text-gray-400'}`}>
                    2. Chạm Sinh Trắc Học
                  </div>
                  <div className={`p-1.5 rounded border ${currentStep >= 3 ? 'border-blue-400 bg-white text-blue-800 font-semibold' : 'border-gray-200 text-gray-400'}`}>
                    3. Lưu Public Key
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang kết nối cảm biến sinh trắc học...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  <span>Tạo Tài Khoản & Kích Hoạt Passkey</span>
                </>
              )}
            </button>

            <div className="mt-4 text-center">
              <span className="text-xs text-gray-500">Đã có tài khoản Passkey trên thiết bị này? </span>
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 ml-1"
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
