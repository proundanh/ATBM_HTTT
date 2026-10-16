import { useState } from 'react';
import { X, Globe, ShieldAlert, ShieldCheck, Fingerprint } from 'lucide-react';

interface PhishingDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhishingDemoModal = ({ isOpen, onClose }: PhishingDemoModalProps) => {
  const [fakeDomain] = useState('portal-sinhvien-fake.edu.vn');
  const [tested, setTested] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-xl relative text-gray-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Thử Nghiệm Kịch Bản Chống Phishing (FIDO2 RP ID)</h2>
            <p className="text-xs text-gray-500">Kịch bản minh họa phòng thủ tấn công giả mạo trước Hội đồng</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
          <p>
            Trong hình thức lừa đảo truyền thống (Phishing), kẻ tấn công tạo website giả mạo (ví dụ <code>portal-sinhvien-fake.edu.vn</code>). Khi sinh viên gõ mật khẩu vào, kẻ tấn công lập tức cướp được tài khoản.
          </p>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Relying Party ID thực tế:</span>
              <span className="text-blue-700 font-bold">localhost</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Origin trình duyệt ghi nhận:</span>
              <span className="text-blue-700 font-bold">{window.location.origin}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
            <div className="flex items-center space-x-2 text-rose-800 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Cơ chế phòng thủ của chuẩn W3C WebAuthn:</span>
            </div>
            <p className="text-[11px] text-rose-900/90 leading-relaxed">
              Trình duyệt (Chrome / Edge / Safari) tự động gắn chặt khóa bí mật với tên miền (RP ID).
              Nếu sinh viên bị lừa truy cập vào trang web giả mạo <strong>{fakeDomain}</strong> hoặc qua địa chỉ IP lạ,
              trình duyệt sẽ <strong>từ chối giải phóng khóa của tên miền thật</strong> và ném ra lỗi <code>SecurityError</code>.
              Kẻ tấn công hoàn toàn không có cách nào đánh cắp được chữ ký số!
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setTested(true)}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
            >
              <Fingerprint className="w-4 h-4" />
              <span>Mô phỏng thử đăng nhập từ trang Phishing</span>
            </button>
          </div>

          {tested && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-start space-x-2.5 animate-fade-in">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>KẾT QUẢ KIỂM CHỨNG:</strong> Trình duyệt lập tức ngắt phiên làm việc và từ chối gọi Authenticator.
                Mã lỗi chuẩn: <code>DOMException: The operation is insecure (SecurityError)</code>. Trang web giả mạo thu được 0 bytes dữ liệu.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
