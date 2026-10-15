import { useState } from 'react';
import { X, Copy, Check, Eye, Terminal, Shield } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white">Thanh Tra Gói Tin FIDO2 / WebAuthn</h2>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Inspect Data
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Hiển thị cấu trúc JSON thực tế trao đổi giữa Trình duyệt và Server C#
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {packets.length > 0 && (
              <button
                onClick={onClearPackets}
                className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Xóa lịch sử
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Packets list */}
          <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto p-3 space-y-2 bg-slate-950/30">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              Gói tin đã bắt ({packets.length})
            </div>

            {packets.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                Chưa có gói tin nào. Hãy thực hiện Đăng ký hoặc Đăng nhập để quan sát luồng trao đổi.
              </div>
            ) : (
              packets.map((pkt) => {
                const isSelected = currentPacket?.id === pkt.id;
                return (
                  <div
                    key={pkt.id}
                    onClick={() => setSelectedPacketId(pkt.id)}
                    className={`p-3 rounded-xl cursor-pointer text-xs transition-all border ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500/50 text-white shadow-md'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-mono text-indigo-400">{pkt.phase}</span>
                      <span>{pkt.timestamp}</span>
                    </div>
                    <div className="font-semibold truncate">{pkt.title}</div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Packet Details & JSON viewer */}
          <div className="flex-1 flex flex-col overflow-hidden p-4 bg-slate-900/40">
            {currentPacket ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <span>{currentPacket.title}</span>
                    </h3>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Thời điểm: {currentPacket.timestamp}
                    </div>
                  </div>

                  <button
                    onClick={handleCopyJson}
                    className="flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Đã Copy</span>
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
                  <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 mb-3 flex items-start space-x-2">
                    <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{currentPacket.notes}</p>
                  </div>
                )}

                {/* JSON Display */}
                <div className="flex-1 overflow-auto rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-[11px] text-emerald-400/90 leading-relaxed shadow-inner">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(currentPacket.data, null, 2)}
                  </pre>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                Chọn một gói tin bên trái để xem chi tiết
              </div>
            )}
          </div>
        </div>

        {/* Footer Explanation for Presentation */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mục đích Thuyết trình Đồ án:</span>
          </div>
          <p>
            Giảng viên có thể kiểm tra trực tiếp chuỗi <strong>challenge</strong> dùng một lần (ngăn chặn Replay Attack),
            chuỗi <strong>origin</strong> trong <code>clientDataJSON</code> (chống Phishing), và thuật toán ký <strong>ES256 (COSE alg: -7)</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
