import React, { useState } from 'react';
import { Copy, Check, QrCode, Shield, Calendar, User, Briefcase, FileText, Hash, Key, Award } from 'lucide-react';

export interface AuditCardProps {
  title?: string;
  fileName: string;
  signerName: string;
  signerRole?: string;
  reason?: string;
  timestamp: string;
  originalHash: string;
  recalculatedHash?: string;
  publicKey: string;
  signature: string;
  qrDataUrl?: string;
  isValid?: boolean;
}

export const AuditCard: React.FC<AuditCardProps> = ({
  title = 'Bằng Chứng Xác Thực & Nhật Ký Kiểm Toán (Audit Trail)',
  fileName,
  signerName,
  signerRole = 'Signer / Auditor',
  reason = 'Phê duyệt & Chứng thực toàn vẹn',
  timestamp,
  originalHash,
  recalculatedHash,
  publicKey,
  signature,
  qrDataUrl,
  isValid = true,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl">
      {/* Card Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-850 to-slate-900 border-b border-slate-700/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-xs text-slate-400">Thuật toán Ed25519 (RFC 8032) & SHA-256 (FIPS 180-4)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isValid ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Shield className="w-3.5 h-3.5" />
              Chữ ký Hợp lệ
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <Shield className="w-3.5 h-3.5" />
              Không Hợp lệ
            </span>
          )}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metadata Fields */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tên tệp gốc</span>
              </div>
              <p className="text-sm font-semibold text-white truncate" title={fileName}>
                {fileName}
              </p>
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Thời điểm ký (UTC)</span>
              </div>
              <p className="text-sm font-semibold text-white font-mono truncate" title={timestamp}>
                {timestamp}
              </p>
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Người ký</span>
              </div>
              <p className="text-sm font-semibold text-white truncate">
                {signerName}
              </p>
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
                <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                <span>Chức danh & Lý do</span>
              </div>
              <p className="text-sm font-semibold text-white truncate" title={`${signerRole} - ${reason}`}>
                {signerRole}
              </p>
              <p className="text-xs text-slate-400 truncate mt-0.5" title={reason}>
                {reason}
              </p>
            </div>
          </div>

          {/* Cryptographic Details */}
          <div className="space-y-3 pt-2">
            {/* SHA-256 Hash */}
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 font-medium text-slate-400">
                  <Hash className="w-3.5 h-3.5 text-emerald-400" />
                  Mã băm SHA-256 (64 hex characters)
                </span>
                <button
                  onClick={() => copyToClipboard(originalHash, 'hash')}
                  className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition"
                  title="Copy SHA-256 Hash"
                >
                  {copiedKey === 'hash' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'hash' ? 'Đã copy' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-emerald-300/90 break-all select-all bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                {originalHash}
              </p>
              {recalculatedHash && recalculatedHash !== originalHash && (
                <div className="mt-2 text-xs font-mono text-rose-400 bg-rose-950/30 p-2 rounded-lg border border-rose-900/50">
                  <span className="font-bold">Mã băm thực tế bị lệch:</span> {recalculatedHash}
                </div>
              )}
            </div>

            {/* Public Key */}
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 font-medium text-slate-400">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  Khóa công khai Ed25519 Public Key (32 bytes Base64)
                </span>
                <button
                  onClick={() => copyToClipboard(publicKey, 'pub')}
                  className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition"
                  title="Copy Public Key"
                >
                  {copiedKey === 'pub' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'pub' ? 'Đã copy' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-slate-300 break-all select-all bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                {publicKey}
              </p>
            </div>

            {/* Signature */}
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 font-medium text-slate-400">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Chữ ký số Ed25519 Signature (64 bytes Base64)
                </span>
                <button
                  onClick={() => copyToClipboard(signature, 'sig')}
                  className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition"
                  title="Copy Signature"
                >
                  {copiedKey === 'sig' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'sig' ? 'Đã copy' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-slate-400 break-all select-all bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                {signature}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: QR Code & Verification Proof */}
        <div className="flex flex-col items-center justify-between p-5 bg-slate-950/70 rounded-xl border border-slate-800/80 text-center">
          <div className="w-full">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-300 mb-3">
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>MÃ PHÁP LÝ NHẬN DẠNG</span>
            </div>

            {qrDataUrl ? (
              <div className="bg-white p-2.5 rounded-xl shadow-lg shadow-black/40 inline-block border border-slate-200">
                <img src={qrDataUrl} alt="Mã QR Chứng thực" className="w-44 h-44 object-contain" />
              </div>
            ) : (
              <div className="w-44 h-44 rounded-xl bg-slate-900 border border-dashed border-slate-700 flex flex-col items-center justify-center mx-auto text-slate-500 text-xs p-4">
                <QrCode className="w-8 h-8 mb-2 opacity-50" />
                <span>QR Code sẽ được tạo tự động khi ký</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed text-left w-full space-y-1.5">
            <p className="flex items-start gap-1.5">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Quét mã QR để trích xuất chữ ký số, khóa công khai và mã băm SHA-256.</span>
            </p>
            <p className="flex items-start gap-1.5">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Tệp gốc được nhúng độc lập bên trong attachment <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">original_source.pdf</code>.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
