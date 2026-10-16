import { useState, useEffect, type FormEvent } from 'react';
import {
  ShieldCheck,
  CreditCard,
  LogOut,
  Fingerprint,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  BookOpen,
  GraduationCap,
  AlertTriangle,
  RefreshCw,
  Laptop,
  History,
} from 'lucide-react';
import type { User, InspectPacket, ProfileData } from '../lib/types';
import { getProfile, requestStepUpOptions, verifyStepUp, updateProfile } from '../lib/api';
import { startPasskeyAuthentication, translateWebAuthnError } from '../lib/webauthn';

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
  onAddInspectPacket: (packet: InspectPacket) => void;
  onNavigateTab: (tab: 'credentials' | 'logs' | 'admin') => void;
}

export const StudentDashboard = ({
  user,
  onLogout,
  onAddInspectPacket,
  onNavigateTab,
}: StudentDashboardProps) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Form states for sensitive info
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [scholarshipAccount, setScholarshipAccount] = useState('');

  // Step-Up Modal states
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [stepUpLoading, setStepUpLoading] = useState(false);
  const [stepUpSuccess, setStepUpSuccess] = useState(false);
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoadingProfile(true);
    setProfileError(null);
    try {
      const res = await getProfile();
      if (res.isSuccess && res.value) {
        setProfile(res.value);
        setEmail(res.value.email || user.email || '');
        setPhone(res.value.phone || '');
        setScholarshipAccount(res.value.scholarshipAccount || '');
      } else {
        setProfileError(res.error?.message || 'Không thể tải thông tin hồ sơ.');
      }
    } catch {
      setProfileError('Lỗi kết nối khi tải hồ sơ sinh viên.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleOpenStepUpConfirm = (e: FormEvent) => {
    e.preventDefault();
    setStepUpError(null);
    setStepUpSuccess(false);
    setStepUpOpen(true);
  };

  const handlePerformStepUpAndUpdate = async () => {
    setStepUpLoading(true);
    setStepUpError(null);

    const payloadObj = {
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      scholarshipAccount: scholarshipAccount.trim(),
    };

    try {
      // 1. Gọi POST /api/v1/auth/stepup/options
      const optionsRes = await requestStepUpOptions({
        action: 'UpdateProfile',
        payload: payloadObj,
      });

      if (!optionsRes.isSuccess || !optionsRes.value) {
        throw new Error(optionsRes.error?.message || 'Không thể lấy Challenge Step-Up từ Server.');
      }

      const { ceremonyId, options } = optionsRes.value;

      onAddInspectPacket({
        id: `pkt-${Date.now()}-stepup-options`,
        title: 'Step-Up Options (Thử thách sinh trắc)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'stepup',
        phase: 'Server Options',
        data: options,
        notes: `Server yêu cầu chữ ký số cho thao tác UpdateProfile: email=${payloadObj.email}, phone=${payloadObj.phone}, scholarshipAccount=${payloadObj.scholarshipAccount}`,
      });

      // 2. Kích hoạt WebAuthn hardware biometric prompt
      const clientCredential = await startPasskeyAuthentication(options);

      onAddInspectPacket({
        id: `pkt-${Date.now()}-stepup-cred`,
        title: 'Step-Up Client Signature (Chữ ký phần cứng)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'stepup',
        phase: 'Client Authenticator',
        data: clientCredential,
        notes: 'Khóa riêng phần cứng ký lên Challenge và Canonical Action Hash.',
      });

      // 3. Gọi POST /api/v1/auth/stepup/verify để đổi lấy StepUpToken
      const verifyRes = await verifyStepUp({
        ceremonyId,
        credential: clientCredential,
      });

      if (!verifyRes.isSuccess || !verifyRes.value) {
        throw new Error(verifyRes.error?.message || 'Xác thực sinh trắc học không thành công.');
      }

      const { stepUpToken, expiresInSeconds } = verifyRes.value;

      onAddInspectPacket({
        id: `pkt-${Date.now()}-stepup-verified`,
        title: 'Step-Up Token Được Cấp (TTL)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'stepup',
        phase: 'Server Verify Result',
        data: { stepUpToken, expiresInSeconds },
        notes: `StepUpToken hợp lệ trong ${expiresInSeconds}s, dùng một lần để ủy quyền thực hiện tác vụ nhạy cảm.`,
      });

      // 4. Gọi PUT /api/v1/profile kèm header X-StepUp-Token
      const updateRes = await updateProfile(
        {
          email: payloadObj.email,
          phone: payloadObj.phone,
          scholarshipAccount: payloadObj.scholarshipAccount,
        },
        stepUpToken
      );

      if (!updateRes.isSuccess || !updateRes.value) {
        throw new Error(updateRes.error?.message || 'Cập nhật hồ sơ thất bại dù đã xác thực Step-Up.');
      }

      setProfile(updateRes.value);
      setStepUpSuccess(true);
      setSaveSuccessMessage('Thông tin tài khoản và liên lạc đã được bảo mật cập nhật thành công!');

      setTimeout(() => {
        setStepUpOpen(false);
      }, 1400);

      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      setStepUpError(translateWebAuthnError(err));
    } finally {
      setStepUpLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xl shadow-xs">
            {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                {profile?.fullName || user.fullName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {user.role === 'Admin' ? 'Quản trị viên' : 'Sinh viên'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                MSSV: <strong className="text-gray-900 font-mono">{user.studentCode}</strong>
              </span>
              <span>•</span>
              <span>
                Lớp: <strong className="text-gray-900">{profile?.class || 'D21-CQCN01'}</strong>
              </span>
              <span>•</span>
              <span>
                Ngành: <strong className="text-gray-900">{profile?.major || 'An toàn Thông tin'}</strong>
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={() => onNavigateTab('credentials')}
            className="px-3.5 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <Laptop className="w-3.5 h-3.5 text-blue-600" />
            <span>Thiết bị Passkey</span>
          </button>

          <button
            onClick={() => onNavigateTab('logs')}
            className="px-3.5 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span>Nhật ký</span>
          </button>

          <button
            onClick={onLogout}
            className="px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{saveSuccessMessage}</span>
        </div>
      )}

      {profileError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{profileError}</span>
          </div>
          <button
            onClick={loadProfile}
            className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Sensitive Form & Academic Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sensitive Action Card: STK Học bổng & Liên lạc (Cần Step-Up) */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Thông Tin Nhạy Cảm & Tài Khoản Nhận Học Bổng
                  </h2>
                  <p className="text-xs text-gray-500">
                    Được bảo vệ nghiêm ngặt bằng cơ chế Step-Up Authentication
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                Xác thực lại phần cứng
              </span>
            </div>

            <form onSubmit={handleOpenStepUpConfirm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>Email liên lạc sinh viên</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sv@student.ptit.edu.vn"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>Số điện thoại chính chủ</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center space-x-1">
                    <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                    <span>Số tài khoản ngân hàng chi trả học bổng</span>
                  </label>
                  <input
                    type="text"
                    value={scholarshipAccount}
                    onChange={(e) => setScholarshipAccount(e.target.value)}
                    placeholder="Nhập số tài khoản ngân hàng chính chủ (VD: 1029384756 - Vietcombank)"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200/80 text-xs text-blue-900 flex items-start space-x-2.5">
                <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed text-[11px]">
                  <strong>Vì sao cần Step-Up?</strong> Kẻ xấu ngồi vào máy tính khi sinh viên quên khóa màn hình có thể cố đổi số tài khoản để chiếm đoạt tiền học bổng. Khi bấm Lưu, hệ thống bắt buộc kích hoạt chip TPM / Windows Hello / Touch ID để xác minh vân tay chính chủ mới cho phép ghi đè.
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-gray-500">
                  Cập nhật gần nhất: {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString('vi-VN') : 'Mới tạo'}
                </span>
                <button
                  type="submit"
                  disabled={isLoadingProfile}
                  className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center space-x-2 shadow-xs cursor-pointer"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>Xác Nhận Lưu & Quét Passkey</span>
                </button>
              </div>
            </form>
          </div>

          {/* Academic Profile Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Tiến Độ Học Tập & Tín Chỉ Tích Lũy</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-[11px] text-gray-500">Khóa Học</div>
                <div className="text-sm font-bold text-gray-900 mt-1">2021 - 2026</div>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-[11px] text-gray-500">Tín Chỉ Tích Lũy</div>
                <div className="text-sm font-bold text-blue-600 mt-1">118 / 142</div>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-[11px] text-gray-500">Điểm GPA Tích Lũy</div>
                <div className="text-sm font-bold text-emerald-600 mt-1">3.68 / 4.0</div>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-[11px] text-gray-500">Tình Trạng Sinh Viên</div>
                <div className="text-sm font-bold text-emerald-600 mt-1">Bình Thường</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security Status & Passkey Architecture */}
        <div className="space-y-6">
          {/* Security Summary Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-gray-900 font-bold text-sm border-b border-gray-100 pb-3">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Tình Trạng An Toàn Tài Khoản</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                <span className="text-gray-600">Mật khẩu trong DB:</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  0 ký tự (Không tồn tại)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                <span className="text-gray-600">Thuật toán khóa:</span>
                <span className="font-mono text-gray-900 font-semibold">ES256 (ECDSA P-256)</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                <span className="text-gray-600">Chống Phishing:</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Gắn chặt Domain RP ID
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                <span className="text-gray-600">Đăng nhập không mật khẩu:</span>
                <span className="font-semibold text-blue-700">WebAuthn Level 3</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onNavigateTab('credentials')}
                className="w-full py-2.5 px-3 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-medium text-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Quản Lý Thiết Bị Passkey ({user.studentCode})</span>
              </button>
            </div>
          </div>

          {/* Quick Guide for Council Presentation */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3 text-xs text-gray-600">
            <div className="font-bold text-gray-900 flex items-center space-x-1.5">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Điểm Sáng Đồ Án ATBM</span>
            </div>
            <ul className="space-y-2 text-[11px] leading-relaxed">
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  <strong>Không sợ lộ mật khẩu:</strong> Sinh viên không có mật khẩu để bị lừa hoặc lộ trong các vụ rò rỉ dữ liệu (Credential Stuffing).
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  <strong>Bảo vệ tiền học bổng:</strong> Mọi thay đổi về STK bắt buộc phải có chữ ký phần cứng Step-Up thời gian thực.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  <strong>Audit Log chi tiết:</strong> Mọi thao tác đều ghi nhật ký IP, thiết bị và Sign Count chống nhân bản khóa (Cloned Authenticator).
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Step-Up Authentication Modal */}
      {stepUpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 text-center shadow-xl">
            {stepUpSuccess ? (
              <div className="py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Xác Thực Sinh Trắc Thành Công!</h3>
                <p className="text-xs text-gray-500">
                  Hồ sơ và thông tin số tài khoản học bổng đã được cập nhật thành công.
                </p>
              </div>
            ) : (
              <div>
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-200">
                  <Fingerprint className={`w-7 h-7 ${stepUpLoading ? 'animate-pulse text-blue-700' : ''}`} />
                </div>

                <h3 className="text-base font-bold text-gray-900 mb-1">
                  Xác Thực Bổ Sung (Step-Up Authentication)
                </h3>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Bạn đang thay đổi thông tin nhạy cảm. Để bảo vệ an toàn, hãy chạm cảm biến vân tay / Windows Hello / Face ID để cấp quyền.
                </p>

                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-left text-xs mb-4 font-mono space-y-1">
                  <div className="text-gray-500 text-[11px]">Thông tin sắp lưu:</div>
                  <div className="text-gray-800 truncate">• Email: {email || '(trống)'}</div>
                  <div className="text-gray-800 truncate">• SĐT: {phone || '(trống)'}</div>
                  <div className="text-gray-800 truncate font-bold text-blue-700">
                    • STK học bổng: {scholarshipAccount || '(trống)'}
                  </div>
                </div>

                {stepUpError && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{stepUpError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    onClick={handlePerformStepUpAndUpdate}
                    disabled={stepUpLoading}
                    className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
                  >
                    {stepUpLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang chờ chạm cảm biến...</span>
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4" />
                        <span>Chạm cảm biến xác nhận ngay</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setStepUpOpen(false)}
                    disabled={stepUpLoading}
                    className="w-full py-2 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors cursor-pointer"
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
