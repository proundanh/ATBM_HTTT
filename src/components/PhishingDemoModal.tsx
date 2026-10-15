import { useState } from 'react';
import { X, Globe, ShieldAlert, ShieldCheck, Fingerprint } from 'lucide-react';

interface PhishingDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhishingDemoModal = ({ isOpen, onClose }: PhishingDemoModalProps) => {
  const [fakeDomain] = useState('portal-sinhvien-fake.com');
  const [tested, setTested] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Thử Nghiệm Kịch Bản Chống Phishing (FIDO2 RP ID)</h2>
            <p className="text-xs text-slate-400">Bước 4 trong Kịch bản Demo 5 phút trước Hội đồng</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <p>
            Trong hình thức lừa đảo truyền thống (Phishing), kẻ tấn công dựng một website giả mạo (ví dụ <code>portal-sinhvien-fake.com</code>). Khi sinh viên gõ mật khẩu vào, kẻ tấn công sẽ cướp được mật khẩu.
          </p>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Relying Party ID thực tế:</span>
              <span className="text-emerald-400 font-bold">localhost</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Origin trình duyệt ghi nhận:</span>
              <span className="text-emerald-400 font-bold">{window.location.origin}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2">
            <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Cơ chế phòng thủ của chuẩn W3C WebAuthn:</span>
            </div>
            <p className="text-[11px] text-rose-200/90 leading-relaxed">
              Trình duyệt (Chrome / Edge / Safari) tự động gắn chặt khóa bí mật với tên miền (RP ID).
              Nếu sinh viên bị lừa truy cập vào trang web giả mạo <strong>{fakeDomain}</strong> hoặc mở bằng địa chỉ IP lạ,
              trình duyệt sẽ <strong>từ chối giải phóng khóa của tên miền thật</strong> và ném ra lỗi <code>SecurityError</code>.
              Kẻ tấn công hoàn toàn không có cách nào đánh cắp được chữ ký số!
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setTested(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-600/20 flex items-center justify-center space-x-2"
            >
              <Fingerprint className="w-4 h-4" />
              <span>Mô phỏng thử đăng nhập từ trang Phishing</span>
            </button>
          </div>

          {tested && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-[11px] text-emerald-200 flex items-start space-x-2 animate-fade-in">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
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
