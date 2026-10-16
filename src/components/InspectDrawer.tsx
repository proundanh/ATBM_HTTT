import { useState, useEffect } from 'react';
import { X, Copy, Check, Eye, Terminal, ShieldCheck, ChevronRight } from 'lucide-react';
import type { InspectPacket } from '../lib/types';

interface InspectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  packets: InspectPacket[];
  onClearPackets: () => void;
}

export const InspectDrawer = ({
  isOpen,
  onClose,
  packets,
  onClearPackets,
}: InspectDrawerProps) => {
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentPacket =
    packets.find((p) => p.id === selectedPacketId) || packets[packets.length - 1];

  const handleCopyJson = () => {
    if (!currentPacket) return;
    navigator.clipboard.writeText(JSON.stringify(currentPacket.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-2xl bg-white border-l border-gray-200 h-full flex flex-col shadow-2xl text-gray-900">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-gray-900">Thanh Tra Gói Tin FIDO2 / WebAuthn</h2>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-mono px-2 py-0.5 rounded-full border border-blue-200">
                  Inspect Data
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Hiển thị cấu trúc JSON thực tế trao đổi giữa Trình duyệt và Server C#
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {packets.length > 0 && (
              <button
                onClick={onClearPackets}
                className="text-xs text-gray-500 hover:text-gray-900 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Xóa lịch sử
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Packets list */}
          <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto p-3 space-y-2 bg-gray-50/40">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">
              Gói tin đã bắt ({packets.length})
            </div>

            {packets.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                Chưa có gói tin nào. Hãy thực hiện Đăng ký, Đăng nhập hoặc Step-Up để quan sát luồng trao đổi.
              </div>
            ) : (
              packets.map((pkt) => {
                const isSelected = currentPacket?.id === pkt.id;
                return (
                  <div
                    key={pkt.id}
                    onClick={() => setSelectedPacketId(pkt.id)}
                    className={`p-3 rounded-lg cursor-pointer text-xs transition-all border ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                      <span className="font-mono font-medium text-blue-600">{pkt.phase}</span>
                      <span>{pkt.timestamp}</span>
                    </div>
                    <div className="font-semibold text-gray-900 truncate flex items-center justify-between">
                      <span>{pkt.title}</span>
                      {isSelected && <ChevronRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Packet Details & JSON viewer */}
          <div className="flex-1 flex flex-col overflow-hidden p-4 bg-white">
            {currentPacket ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900">
                      {currentPacket.title}
                    </h3>
                    <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                      Thời điểm ghi nhận: {currentPacket.timestamp}
                    </div>
                  </div>

                  <button
                    onClick={handleCopyJson}
                    className="flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors border border-gray-200 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Đã Copy</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>

                {currentPacket.notes && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 mb-3 flex items-start space-x-2">
                    <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <p className="leading-relaxed text-[11px]">{currentPacket.notes}</p>
                  </div>
                )}

                {/* JSON Display */}
                <div className="flex-1 overflow-auto rounded-lg bg-gray-900 border border-gray-800 p-3.5 font-mono text-[11px] text-emerald-400 leading-relaxed shadow-inner">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(currentPacket.data, null, 2)}
                  </pre>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
                Chọn một gói tin bên trái để xem chi tiết
              </div>
            )}
          </div>
        </div>

        {/* Footer Explanation for Presentation */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/70 text-[11px] text-gray-600 space-y-1">
          <div className="font-semibold text-gray-900 flex items-center space-x-1.5">
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Mục đích Thuyết trình & Bảo vệ Đồ án:</span>
          </div>
          <p className="leading-relaxed">
            Hội đồng có thể kiểm tra trực tiếp chuỗi <strong>challenge</strong> dùng một lần (ngăn chặn Replay Attack),
            chuỗi <strong>origin</strong> trong <code>clientDataJSON</code> (chống Phishing), và thuật toán ký <strong>ES256 (COSE alg: -7)</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
