import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  Copy,
  Check,
  RefreshCw,
  X,
  FileText,
  Calendar,
  User,
  Key,
  Hash,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { verifySignedPdf, type VerificationResult } from '../lib/pdfEngine';
import { formatFileSize } from '../lib/utils';
import QRCode from 'qrcode';

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

export const VerifierTab: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [notVerifiedError, setNotVerifiedError] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      showToast('error', 'Chỉ chấp nhận tệp định dạng PDF (.pdf)!');
      return;
    }

    setSelectedFile(file);
    setVerificationResult(null);
    setNotVerifiedError(null);
    setQrDataUrl(null);

    // Auto verify upon upload
    await executeVerification(file);
  };

  const executeVerification = async (file: File) => {
    setIsVerifying(true);
    setNotVerifiedError(null);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const result = await verifySignedPdf(bytes);
      setVerificationResult(result);

      if (result.isValid) {
        showToast('success', 'Xác thực thành công: Tài liệu nguyên bản 100%!');
        // Generate QR code for display
        const qrPayload = JSON.stringify({
          h: result.originalHash,
          p: result.publicKey,
          n: result.signerName,
        });
        const qr = await QRCode.toDataURL(qrPayload, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 200,
        });
        setQrDataUrl(qr);
      } else {
        showToast('error', 'Cảnh báo: Tài liệu đã bị can thiệp hoặc chữ ký không hợp lệ!');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Tài liệu không phải file có chứng thực hợp lệ';
      setNotVerifiedError(errMsg);
      showToast('error', errMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  const resetAll = () => {
    setSelectedFile(null);
    setVerificationResult(null);
    setNotVerifiedError(null);
    setQrDataUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download original source file extracted from attachment
  const handleDownloadOriginalSource = () => {
    if (!verificationResult?.extractedFileBytes) return;
    const blob = new Blob([verificationResult.extractedFileBytes as unknown as BlobPart], {
      type: 'application/pdf',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pristine_source_${verificationResult.fileName || 'document'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('info', 'Đã tải xuống tệp PDF gốc nguyên bản từ attachment!');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border shadow-lg transition-all animate-in fade-in slide-in-from-top-3 ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : 'bg-slate-800/90 border-slate-700 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
            {notification.type === 'info' && <RefreshCw className="w-5 h-5 text-blue-400 shrink-0" />}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Drag & Drop Area */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            <span>Nạp Tệp PDF Cần Xác Thực</span>
          </h2>
          <span className="text-xs text-slate-400">Kiểm tra chữ ký số Ed25519 & Tính toàn vẹn SHA-256</span>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
              : selectedFile
              ? 'border-emerald-500/50 bg-emerald-950/20'
              : 'border-slate-700 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-900/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex items-center justify-between bg-slate-900/80 p-4 rounded-xl border border-emerald-500/30">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white truncate max-w-[280px] sm:max-w-md">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    executeVerification(selectedFile);
                  }}
                  disabled={isVerifying}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                  <span>{isVerifying ? 'Đang kiểm tra...' : 'Kiểm tra lại'}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetAll();
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Gỡ bỏ tệp này"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Kéo thả tệp PDF có chữ ký vào đây hoặc{' '}
                  <span className="text-emerald-400 hover:underline">bấm để duyệt</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Hệ thống tự động giải nén attachment bit-exact và đối chiếu chữ ký Ed25519
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading Indicator */}
      {isVerifying && (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-300 font-medium">
            Đang trích xuất attachment và kiểm tra tính toàn vẹn chữ ký số...
          </p>
        </div>
      )}

      {/* RESULT 1: Invalid Document Format (No Attachment / Not Signed) */}
      {notVerifiedError && !isVerifying && (
        <div className="p-6 rounded-2xl bg-rose-500/10 border-2 border-rose-500 shadow-2xl space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 shrink-0">
              <AlertCircle className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 mb-2">
                <span>KHÔNG CÓ CHỨNG THỰC HỢP LỆ</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                {notVerifiedError}
              </h3>
              <p className="text-xs text-rose-200/80 leading-relaxed">
                Tệp tin PDF này không chứa tệp đính kèm chứng thực (<code className="bg-rose-950/60 px-1 py-0.5 rounded text-rose-300">original_source.pdf</code>) hoặc chưa từng được ký số qua hệ thống Ed25519 PDF Audit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RESULT 2: Valid Verification (Emerald Green Theme) */}
      {verificationResult && verificationResult.isValid && !isVerifying && (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/10 space-y-6">
          {/* Header Banner */}
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-emerald-500/30">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>TÀI LIỆU NGUYÊN BẢN 100%</span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Chữ Ký Số & Toàn Vẹn Tệp Tin Hợp Lệ
                </h3>
              </div>
            </div>

            {verificationResult.extractedFileBytes && (
              <button
                type="button"
                onClick={handleDownloadOriginalSource}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Tải File Gốc Nguyên Bản (Source Attachment)</span>
              </button>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-emerald-500/20">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Người ký</span>
              </div>
              <p className="text-sm font-semibold text-white truncate">
                {verificationResult.signerName}
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-emerald-500/20">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Thời điểm ký (UTC)</span>
              </div>
              <p className="text-xs font-mono text-white truncate" title={verificationResult.timestamp}>
                {verificationResult.timestamp}
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-emerald-500/20">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tên file</span>
              </div>
              <p className="text-sm font-semibold text-white truncate" title={verificationResult.fileName}>
                {verificationResult.fileName || selectedFile?.name}
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-emerald-500/20">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>Thuật toán</span>
              </div>
              <p className="text-xs font-mono text-emerald-300 font-semibold truncate">
                Ed25519 + SHA-256
              </p>
            </div>
          </div>

          {/* Cryptographic Hashes & Public Key */}
          <div className="space-y-3 pt-2">
            {/* SHA-256 Hash */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-emerald-500/30">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Hash className="w-4 h-4" />
                  Mã băm SHA-256 khớp tuyệt đối (Bit-Exact Match):
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(verificationResult.recalculatedHash, 'hash')}
                  className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition"
                >
                  {copiedKey === 'hash' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'hash' ? 'Đã copy' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-emerald-300 break-all select-all bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                {verificationResult.recalculatedHash}
              </p>
            </div>

            {/* Public Key */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-emerald-500/30">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-400" />
                  Khóa công khai Ed25519 Public Key:
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(verificationResult.publicKey, 'pub')}
                  className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition"
                >
                  {copiedKey === 'pub' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'pub' ? 'Đã copy' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-slate-300 break-all select-all bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                {verificationResult.publicKey}
              </p>
            </div>

            {/* Signature */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-emerald-500/30">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Chữ ký số Ed25519 Signature (64 bytes Base64):
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(verificationResult.signature, 'sig')}
                  className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition"
                >
                  {copiedKey === 'sig' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'sig' ? 'Đã copy' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-slate-400 break-all select-all bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                {verificationResult.signature}
              </p>
            </div>

            {/* QR Code Verification Proof */}
            {qrDataUrl && (
              <div className="flex items-center gap-4 p-4 bg-slate-950/80 rounded-xl border border-emerald-500/30">
                <div className="bg-white p-2 rounded-xl shrink-0 shadow-md">
                  <img src={qrDataUrl} alt="QR Code" className="w-20 h-20 object-contain" />
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-semibold text-emerald-400 text-sm">Mã QR Bằng Chứng Pháp Lý</p>
                  <p className="text-slate-400 leading-relaxed">
                    Mã QR chứa thông tin đối soát gồm SHA-256 Hash, Public Key và Tên người ký đã được mã hóa trực tiếp trong tài liệu.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULT 3: Tampered Document (Rose Red Theme) */}
      {verificationResult && !verificationResult.isValid && !isVerifying && (
        <div className="p-6 rounded-2xl bg-rose-500/10 border-2 border-rose-500 shadow-2xl shadow-rose-500/10 space-y-6">
          {/* Header Banner */}
          <div className="flex items-start gap-4 pb-4 border-b border-rose-500/30">
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shrink-0">
              <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>CẢNH BÁO: TÀI LIỆU BỊ SỬA ĐỔI HOẶC CHỮ KÝ GIẢ MẠO</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">
                Phát Hiện Vi Phạm Tính Toàn Vẹn Của Tài Liệu
              </h3>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                Chữ ký số mật mã học không còn hiệu lực. Nội dung tài liệu thực tế không khớp với mã băm đã ký hoặc chữ ký số đã bị chỉnh sửa bất hợp pháp.
              </p>
            </div>
          </div>

          {/* Hash Comparison Table */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Hash className="w-4 h-4 text-rose-400" />
              <span>Bảng Đối Chiếu Mã Băm SHA-256 (Phát Hiện Sai Khác)</span>
            </h4>

            <div className="space-y-3">
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold text-slate-300">1. Original Hash (Mã băm lưu trong chứng thư gốc):</span>
                </div>
                <p className="font-mono text-xs text-slate-300 break-all select-all bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                  {verificationResult.originalHash || '(Không xác định)'}
                </p>
              </div>

              <div className="p-3.5 bg-rose-950/40 rounded-xl border border-rose-900/60">
                <div className="flex items-center justify-between text-xs text-rose-300 mb-1">
                  <span className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    2. Recalculated Hash (Mã băm thực tế vừa tính toán lại):
                  </span>
                  <span className="text-[11px] font-bold text-rose-400 uppercase">Sai lệch dữ liệu</span>
                </div>
                <p className="font-mono text-xs text-rose-300 font-semibold break-all select-all bg-slate-950/90 p-2.5 rounded-lg border border-rose-800/60">
                  {verificationResult.recalculatedHash}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-white">Kết luận phân tích an toàn thông tin:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Bất kỳ sự thay đổi dù chỉ 1 bit nội dung tài liệu đều làm thay đổi hoàn toàn mã băm SHA-256 (Hiệu ứng Tuyết lở - Avalanche Effect).</li>
                <li>Do mã băm thực tế khác biệt, phép xác thực thuật toán Ed25519 với khóa công khai tương ứng đã thất bại.</li>
                <li>Văn bản này không thể sử dụng làm căn cứ pháp lý hoặc chứng từ tin cậy.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
