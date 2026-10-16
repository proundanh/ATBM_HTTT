import { useState, useEffect } from 'react';
import {
  Laptop,
  Smartphone,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RefreshCw,
  Fingerprint,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Cloud,
  HardDrive,
  Usb,
} from 'lucide-react';
import type { CredentialItem, InspectPacket, User } from '../lib/types';
import {
  getCredentials,
  renameCredential,
  revokeCredential,
  requestAddCredentialOptions,
  verifyAddCredential,
  requestStepUpOptions,
  verifyStepUp,
} from '../lib/api';
import {
  startPasskeyRegistration,
  startPasskeyAuthentication,
  getDefaultDeviceName,
  translateWebAuthnError,
} from '../lib/webauthn';

interface CredentialsTabProps {
  user: User;
  onAddInspectPacket: (packet: InspectPacket) => void;
}

export const CredentialsTab = ({ user, onAddInspectPacket }: CredentialsTabProps) => {
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Add Credential modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Revoke with Step-Up state
  const [revokeTarget, setRevokeTarget] = useState<CredentialItem | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revokeSuccess, setRevokeSuccess] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await getCredentials();
      if (res.isSuccess && res.value) {
        setCredentials(res.value);
      } else {
        setErrorMsg(res.error?.message || 'Không thể tải danh sách thiết bị.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi tải danh sách thiết bị Passkey.');
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // 1. Rename handler
  const handleStartRename = (item: CredentialItem) => {
    setEditingId(item.id);
    setEditingName(item.deviceName || 'Thiết bị bảo mật');
  };

  const handleSaveRename = async (id: string) => {
    if (!editingName.trim()) return;
    setIsRenaming(true);
    try {
      const res = await renameCredential(id, editingName.trim());
      if (res.isSuccess) {
        setEditingId(null);
        showSuccess('Đã đổi tên thiết bị thành công!');
        await loadCredentials();
      } else {
        setErrorMsg(res.error?.message || 'Không thể đổi tên thiết bị.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi cập nhật tên thiết bị.');
    } finally {
      setIsRenaming(false);
    }
  };

  // 2. Add new Passkey device
  const handleOpenAddModal = () => {
    setNewDeviceName(getDefaultDeviceName());
    setAddError(null);
    setAddModalOpen(true);
  };

  const handlePerformAddCredential = async () => {
    setIsAdding(true);
    setAddError(null);

    try {
      // Step A: Gọi POST /api/v1/credentials/options
      const optionsRes = await requestAddCredentialOptions();
      if (!optionsRes.isSuccess || !optionsRes.value) {
        throw new Error(optionsRes.error?.message || 'Không thể khởi tạo thử thách đăng ký thiết bị mới.');
      }

      const { ceremonyId, options } = optionsRes.value;

      onAddInspectPacket({
        id: `pkt-${Date.now()}-addcred-opts`,
        title: 'Add Credential Options (FIDO2 ExcludeCredentials)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'credentials',
        phase: 'Server Options',
        data: options,
        notes: 'Server gửi options kèm danh sách excludeCredentials để ngăn chặn ghi đè thiết bị đã đăng ký.',
      });

      // Step B: Kích hoạt WebAuthn hardware registration prompt
      const clientCredential = await startPasskeyRegistration(options);

      onAddInspectPacket({
        id: `pkt-${Date.now()}-addcred-sig`,
        title: 'New Hardware Keypair (Attestation & Public Key)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'credentials',
        phase: 'Client Authenticator',
        data: clientCredential,
        notes: 'Khóa công khai mới được sinh ra trong Secure Enclave của thiết bị phụ.',
      });

      // Step C: Gọi POST /api/v1/credentials/verify
      const verifyRes = await verifyAddCredential({
        ceremonyId,
        deviceName: newDeviceName.trim() || getDefaultDeviceName(),
        credential: clientCredential,
      });

      if (!verifyRes.isSuccess) {
        throw new Error(verifyRes.error?.message || 'Không thể lưu khóa thiết bị mới vào hệ thống.');
      }

      onAddInspectPacket({
        id: `pkt-${Date.now()}-addcred-success`,
        title: 'Credential Verified & Stored',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'credentials',
        phase: 'Server Verify Result',
        data: verifyRes.value,
        notes: 'Khóa công khai và AAGUID mới đã được liên kết thành công vào tài khoản sinh viên.',
      });

      setAddModalOpen(false);
      showSuccess('Đã thêm thiết bị Passkey mới thành công!');
      await loadCredentials();
    } catch (err: any) {
      setAddError(translateWebAuthnError(err));
    } finally {
      setIsAdding(false);
    }
  };

  // 3. Revoke Credential with Step-Up
  const handleOpenRevokeModal = (item: CredentialItem) => {
    setRevokeTarget(item);
    setRevokeError(null);
    setRevokeSuccess(false);
  };

  const handlePerformRevoke = async () => {
    if (!revokeTarget) return;
    setIsRevoking(true);
    setRevokeError(null);

    try {
      // Step A: Gọi POST /api/v1/auth/stepup/options với action = RevokeCredential
      const stepUpOptsRes = await requestStepUpOptions({
        action: 'RevokeCredential',
        payload: { credentialId: revokeTarget.id },
      });

      if (!stepUpOptsRes.isSuccess || !stepUpOptsRes.value) {
        throw new Error(stepUpOptsRes.error?.message || 'Không thể tạo phiên Step-Up cho thao tác thu hồi.');
      }

      const { ceremonyId, options } = stepUpOptsRes.value;

      onAddInspectPacket({
        id: `pkt-${Date.now()}-revoke-stepup-opts`,
        title: 'Step-Up Options: Revoke Credential',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'stepup',
        phase: 'Server Options',
        data: options,
        notes: `Server yêu cầu chữ ký cho thao tác thu hồi thiết bị: credentialId=${revokeTarget.id}`,
      });

      // Step B: Kích hoạt WebAuthn hardware biometric prompt
      const clientCredential = await startPasskeyAuthentication(options);

      onAddInspectPacket({
        id: `pkt-${Date.now()}-revoke-stepup-cred`,
        title: 'Step-Up Signature for Revoke',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'stepup',
        phase: 'Client Authenticator',
        data: clientCredential,
        notes: 'Chữ ký xác minh sinh trắc chính chủ sinh viên.',
      });

      // Step C: Gọi POST /api/v1/auth/stepup/verify để lấy StepUpToken
      const verifyRes = await verifyStepUp({
        ceremonyId,
        credential: clientCredential,
      });

      if (!verifyRes.isSuccess || !verifyRes.value) {
        throw new Error(verifyRes.error?.message || 'Xác thực sinh trắc học không hợp lệ.');
      }

      const { stepUpToken } = verifyRes.value;

      // Step D: Gọi DELETE /api/v1/credentials/{id} với header X-StepUp-Token
      const revokeRes = await revokeCredential(revokeTarget.id, stepUpToken);

      if (!revokeRes.isSuccess) {
        throw new Error(revokeRes.error?.message || 'Không thể thu hồi thiết bị.');
      }

      onAddInspectPacket({
        id: `pkt-${Date.now()}-revoke-done`,
        title: 'Credential Revoked (DELETE 204)',
        timestamp: new Date().toLocaleTimeString(),
        flow: 'credentials',
        phase: 'Server Verify Result',
        data: { id: revokeTarget.id, status: 'Revoked' },
        notes: 'Khóa công khai đã được đánh dấu thu hồi (RevokedAt). Thiết bị này không thể đăng nhập được nữa.',
      });

      setRevokeSuccess(true);
      setTimeout(() => {
        setRevokeTarget(null);
        showSuccess('Đã thu hồi thiết bị bảo mật thành công.');
        loadCredentials();
      }, 1200);
    } catch (err: any) {
      setRevokeError(translateWebAuthnError(err));
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Thiết Bị Bảo Mật Passkey
              </h1>
              <p className="text-xs text-gray-500">
                Quản lý các khóa FIDO2 / WebAuthn đã liên kết với tài khoản sinh viên{' '}
                <strong className="text-gray-900 font-mono">{user.studentCode}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadCredentials}
            disabled={isLoading}
            className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 transition-colors"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm thiết bị mới</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={loadCredentials}
            className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Security Note banner */}
      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 text-xs text-blue-900 flex items-start space-x-3">
        <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-1 text-[11px] leading-relaxed">
          <p>
            <strong>Cơ chế Multi-Device Passkeys:</strong> Mỗi thiết bị bạn đăng ký sẽ sinh một cặp khóa mật mã (Public/Private key) độc lập trong chip bảo mật riêng của thiết bị đó. Bạn có thể đăng ký đồng thời Laptop (Windows Hello) và Điện thoại cá nhân (Touch ID/Face ID) để dự phòng khi mất máy.
          </p>
          <p className="text-blue-800">
            Khi thu hồi (xóa) một thiết bị cũ, hệ thống bắt buộc quét lại vân tay (Step-Up) để ngăn kẻ xấu tự ý xóa quyền truy cập của bạn.
          </p>
        </div>
      </div>

      {/* Credentials List */}
      <div className="space-y-4">
        {isLoading && credentials.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-xs text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Đang tải danh sách thiết bị bảo mật...
          </div>
        ) : credentials.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-xs text-gray-500 space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="font-semibold text-gray-700">Chưa tìm thấy thiết bị nào</div>
            <p className="max-w-md mx-auto text-gray-500">
              Bạn chưa có thiết bị Passkey nào được liên kết hoặc tất cả thiết bị đã bị thu hồi.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs inline-flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Đăng ký thiết bị ngay</span>
            </button>
          </div>
        ) : (
          credentials.map((cred) => {
            const isEditing = editingId === cred.id;
            const isMobile =
              cred.deviceName?.toLowerCase().includes('phone') ||
              cred.deviceName?.toLowerCase().includes('android') ||
              cred.deviceName?.toLowerCase().includes('apple') ||
              cred.deviceName?.toLowerCase().includes('ios');

            return (
              <div
                key={cred.id}
                className={`bg-white border rounded-xl p-5 shadow-xs transition-all ${
                  cred.isCurrent ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Left Device Info */}
                  <div className="flex items-start space-x-3.5">
                    <div
                      className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border ${
                        cred.isCurrent
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}
                    >
                      {isMobile ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                    </div>

                    <div className="space-y-1">
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="px-2.5 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-blue-600"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRename(cred.id)}
                            disabled={isRenaming}
                            className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                            title="Lưu"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            disabled={isRenaming}
                            className="p-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                            title="Hủy"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-gray-900">
                            {cred.deviceName || 'Khóa bảo mật cá nhân'}
                          </h3>
                          <button
                            onClick={() => handleStartRename(cred)}
                            className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                            title="Đổi tên thiết bị"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {cred.isCurrent && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              Thiết bị này
                            </span>
                          )}
                        </div>
                      )}

                      <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>
                          Ngày liên kết: <strong>{new Date(cred.createdAt).toLocaleDateString('vi-VN')}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Đăng nhập gần nhất:{' '}
                          <strong>
                            {cred.lastUsedAt
                              ? new Date(cred.lastUsedAt).toLocaleString('vi-VN')
                              : 'Vừa tạo'}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => handleOpenRevokeModal(cred)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                      title="Thu hồi khóa (Yêu cầu xác thực Step-Up)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Thu hồi</span>
                    </button>
                  </div>
                </div>

                {/* Footer details of Credential */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between text-[11px] text-gray-500 gap-2">
                  <div className="flex items-center space-x-3 font-mono">
                    <span className="flex items-center space-x-1">
                      <HardDrive className="w-3 h-3 text-gray-400" />
                      <span>Hardware-Bound</span>
                    </span>

                    {cred.backupEligible ? (
                      <span className="flex items-center space-x-1 text-blue-700">
                        <Cloud className="w-3 h-3" />
                        <span>Hỗ trợ Sync Cloud</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-gray-600">
                        <Lock className="w-3 h-3 text-gray-400" />
                        <span>Độc lập phần cứng</span>
                      </span>
                    )}

                    {cred.transports && cred.transports.length > 0 && (
                      <span className="flex items-center space-x-1 text-gray-600">
                        <Usb className="w-3 h-3 text-gray-400" />
                        <span>Giao thức: {cred.transports.join(', ')}</span>
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-gray-400 font-mono">
                    ID: {cred.id.slice(0, 8)}...{cred.id.slice(-8)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add New Credential */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Thêm Thiết Bị Bảo Mật Mới</h2>
                <p className="text-xs text-gray-500">Đăng ký thêm Laptop hoặc Điện thoại thông minh</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Đặt tên nhận diện thiết bị
                </label>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="VD: MacBook Pro M2, iPhone 15, Windows PC"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-600 font-medium"
                />
              </div>

              <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200/80 text-[11px] text-blue-900 leading-relaxed space-y-1">
                <div className="font-semibold flex items-center space-x-1.5">
                  <Fingerprint className="w-3.5 h-3.5 text-blue-700" />
                  <span>Quy trình hoạt động:</span>
                </div>
                <p>
                  1. Khi bạn bấm Tiếp tục, trình duyệt sẽ mở giao diện WebAuthn để chọn phương thức lưu khóa (Chip vân tay máy hiện tại hoặc Quét mã QR bằng điện thoại).
                </p>
                <p>
                  2. Cặp khóa mới được sinh ra hoàn toàn độc lập, đảm bảo an toàn tuyệt đối.
                </p>
              </div>

              {addError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={handlePerformAddCredential}
                  disabled={isAdding}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isAdding ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang chờ phần cứng...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      <span>Tiến hành đăng ký khóa</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setAddModalOpen(false)}
                  disabled={isAdding}
                  className="py-2.5 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Revoke Credential with Step-Up confirmation */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 text-center shadow-xl">
            {revokeSuccess ? (
              <div className="py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Đã Thu Hồi Thành Công!</h3>
                <p className="text-xs text-gray-500">
                  Khóa của thiết bị đã bị vô hiệu hóa hoàn toàn trên hệ thống.
                </p>
              </div>
            ) : (
              <div>
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-200">
                  <ShieldAlert className={`w-7 h-7 ${isRevoking ? 'animate-pulse' : ''}`} />
                </div>

                <h3 className="text-base font-bold text-gray-900 mb-1">
                  Xác Thực Step-Up Để Thu Hồi Khóa
                </h3>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Bạn đang chuẩn bị hủy liên kết thiết bị{' '}
                  <strong className="text-gray-900">{revokeTarget.deviceName}</strong>.
                  Hành động này yêu cầu bạn chạm lại cảm biến sinh trắc học để chứng minh chính chủ.
                </p>

                {revokeError && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{revokeError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    onClick={handlePerformRevoke}
                    disabled={isRevoking}
                    className="w-full py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                  >
                    {isRevoking ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang xác thực sinh trắc...</span>
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4" />
                        <span>Quét Passkey & Thu Hồi Ngay</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setRevokeTarget(null)}
                    disabled={isRevoking}
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
