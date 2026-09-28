import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';
import { generateKeyPair, getPublicKeyFromPrivate } from '../lib/crypto';
import { createSignedPdf } from '../lib/pdfEngine';
import { formatFileSize } from '../lib/utils';
import { AuditCard } from './AuditCard';
import QRCode from 'qrcode';

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

export const SignerTab: React.FC = () => {
  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Key state
  const [privateKey, setPrivateKey] = useState<string>('');
  const [publicKey, setPublicKey] = useState<string>('');
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form state
  const [signerName, setSignerName] = useState<string>('Nguyễn Văn A');
  const [signerRole, setSignerRole] = useState<string>('Trưởng ban Kiểm toán số');
  const [reason, setReason] = useState<string>('Phê duyệt & Chứng thực toàn vẹn tài liệu');

  // Execution state
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [lastSignedResult, setLastSignedResult] = useState<{
    fileName: string;
    originalHash: string;
    signature: string;
    publicKey: string;
    signerName: string;
    signerRole: string;
    reason: string;
    timestamp: string;
    qrDataUrl: string;
    downloadUrl: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Handle Drag & Drop
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

    try {
      const buffer = await file.arrayBuffer();
      setSelectedFile(file);
      setFileBytes(new Uint8Array(buffer));
      setLastSignedResult(null);
      showToast('info', `Đã nạp tệp: ${file.name} (${formatFileSize(file.size)})`);
    } catch {
      showToast('error', 'Không thể đọc nội dung tệp PDF đã chọn!');
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFileBytes(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Keypair Management
  const handleGenerateKeys = () => {
    try {
      const { privateKey: priv, publicKey: pub } = generateKeyPair();
      setPrivateKey(priv);
      setPublicKey(pub);
      setKeyError(null);
      showToast('success', 'Đã sinh cặp khóa Ed25519 mới (32 bytes mỗi khóa)!');
    } catch {
      showToast('error', 'Lỗi khi khởi tạo cặp khóa Ed25519!');
    }
  };

  const handlePrivateKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setPrivateKey(val);
    if (!val) {
      setPublicKey('');
      setKeyError(null);
      return;
    }

    try {
      const derivedPub = getPublicKeyFromPrivate(val);
      setPublicKey(derivedPub);
      setKeyError(null);
    } catch {
      setPublicKey('');
      setKeyError('Private Key không hợp lệ! Khóa phải là chuỗi Base64 chuẩn 32 bytes.');
    }
  };

  const copyToClipboard = (text: string, type: 'priv' | 'pub') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(type);
    showToast('info', `Đã sao chép ${type === 'priv' ? 'Private Key' : 'Public Key'} vào clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Execute Signing
  const handleSignPdf = async () => {
    if (!fileBytes || !selectedFile) {
      showToast('error', 'Vui lòng chọn hoặc kéo thả tệp PDF cần ký!');
      return;
    }

    if (!privateKey || !publicKey) {
      showToast('error', 'Vui lòng nhập hoặc tạo cặp khóa Ed25519 hợp lệ!');
      return;
    }

    if (!signerName.trim()) {
      showToast('error', 'Vui lòng nhập họ tên người ký!');
      return;
    }

    setIsSigning(true);

    try {
      const signedBytes = await createSignedPdf({
        originalFileBytes: fileBytes,
        fileName: selectedFile.name,
        signerName: signerName.trim(),
        signerRole: signerRole.trim(),
        reason: reason.trim(),
        privateKeyBase64: privateKey,
      });

      // Generate downloadable blob
      const blob = new Blob([signedBytes as unknown as BlobPart], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const baseName = selectedFile.name.replace(/\.pdf$/i, '');
      const signedFileName = `${baseName}_signed.pdf`;

      // Auto trigger download
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = signedFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Generate preview QR code
      const hashBuffer = await crypto.subtle.digest('SHA-256', fileBytes as unknown as BufferSource);
      let hexHash = '';
      new Uint8Array(hashBuffer).forEach((b) => (hexHash += b.toString(16).padStart(2, '0')));

      const qrPayload = JSON.stringify({
        h: hexHash,
        p: publicKey,
        n: signerName.trim(),
      });
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 250,
      });

      setLastSignedResult({
        fileName: signedFileName,
        originalHash: hexHash,
        signature: 'Đã nhúng trong tệp PDF và bảng chứng thực',
        publicKey,
        signerName,
        signerRole,
        reason,
        timestamp: new Date().toISOString(),
        qrDataUrl,
        downloadUrl,
      });

      showToast('success', `Đã ký thành công! Tệp "${signedFileName}" đã được tải về.`);
    } catch (err: unknown) {
      console.error('Lỗi khi ký tệp PDF:', err);
      const errMsg = err instanceof Error ? err.message : 'Lỗi không xác định khi tạo chữ ký PDF!';
      showToast('error', `Thất bại: ${errMsg}`);
    } finally {
      setIsSigning(false);
    }
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
            {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
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

      {/* Grid: 2 Columns for Form and Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: File Dropzone & Signer Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section: File Upload Drag & Drop */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span>1. Chọn Tệp PDF Cần Ký</span>
              </h2>
              <span className="text-xs text-slate-400">File gốc được bảo toàn 100%</span>
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
                      <p className="text-xs text-emerald-400/80 font-mono">
                        {formatFileSize(selectedFile.size)} • Sẵn sàng ký
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSelectedFile();
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Gỡ bỏ tệp này"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Kéo thả tệp PDF vào đây hoặc{' '}
                      <span className="text-emerald-400 hover:underline">bấm để duyệt</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Chấp nhận tệp .pdf (không giới hạn kích thước)</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Signer Information Form */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-emerald-400" />
              <span>2. Thông Tin Chứng Thư Pháp Lý</span>
            </h2>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Họ và tên người ký <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Chức danh / Vai trò
                </label>
                <input
                  type="text"
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value)}
                  placeholder="Ví dụ: Giám đốc Điều hành / Trưởng phòng Pháp chế"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Lý do ký & Chứng thực
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Phê duyệt nghiệm thu đề tài ATBM HTTT 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Key Management & Action (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Key Management Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span>3. Quản Lý Khóa Ed25519</span>
              </h2>
              <button
                type="button"
                onClick={handleGenerateKeys}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tạo cặp khóa mới</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Khóa ký chuẩn EdDSA (Ed25519) gồm 32 bytes ngẫu nhiên bảo mật cao. Hệ thống suy xuất trực tiếp Public Key từ Private Key.
            </p>

            {/* Private Key Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Private Key (Base64 - 32 bytes)</span>
                {privateKey && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(privateKey, 'priv')}
                    className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition"
                  >
                    {copiedKey === 'priv' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'priv' ? 'Đã copy' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPrivateKey ? 'text' : 'password'}
                  value={privateKey}
                  onChange={handlePrivateKeyChange}
                  placeholder="Nhập hoặc sinh Private Key Base64..."
                  className={`w-full pr-10 pl-3.5 py-2.5 rounded-xl font-mono text-xs bg-slate-950/80 border text-slate-200 placeholder-slate-600 focus:outline-none transition ${
                    keyError
                      ? 'border-rose-500/80 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  title={showPrivateKey ? 'Ẩn khóa' : 'Hiện khóa'}
                >
                  {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {keyError && <p className="text-xs text-rose-400">{keyError}</p>}
            </div>

            {/* Public Key Output */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Public Key (Tự động suy xuất)</span>
                {publicKey && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(publicKey, 'pub')}
                    className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition"
                  >
                    {copiedKey === 'pub' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'pub' ? 'Đã copy' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                readOnly
                value={publicKey}
                placeholder="Public Key sẽ tự động hiển thị tại đây..."
                className="w-full px-3.5 py-2.5 rounded-xl font-mono text-xs bg-slate-950/50 border border-slate-800 text-emerald-400 placeholder-slate-600 cursor-default focus:outline-none"
              />
            </div>
          </div>

          {/* Action Sign & Download Button */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <button
              type="button"
              disabled={!fileBytes || !privateKey || !publicKey || !signerName.trim() || isSigning}
              onClick={handleSignPdf}
              className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg ${
                !fileBytes || !privateKey || !publicKey || !signerName.trim() || isSigning
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.01]'
              }`}
            >
              {isSigning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Đang xử lý & nhúng chữ ký số...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                  <span>Ký & Tải file PDF Đã Chứng Thực</span>
                </>
              )}
            </button>

            <div className="text-[11px] text-slate-400 space-y-1">
              <p>• File gốc được bảo toàn toàn vẹn qua cấu trúc đính kèm độc lập.</p>
              <p>• Tự động vẽ thêm trang chứng thực Audit Trail và mã QR ở cuối tài liệu.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Card Preview (Shown after signing) */}
      {lastSignedResult && (
        <div className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Chứng Thư Vừa Được Khởi Tạo</span>
            </h3>
            <a
              href={lastSignedResult.downloadUrl}
              download={lastSignedResult.fileName}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải lại tệp {lastSignedResult.fileName}</span>
            </a>
          </div>

          <AuditCard
            title="Chứng Thư Ký Số Vừa Khởi Tạo"
            fileName={lastSignedResult.fileName}
            signerName={lastSignedResult.signerName}
            signerRole={lastSignedResult.signerRole}
            reason={lastSignedResult.reason}
            timestamp={lastSignedResult.timestamp}
            originalHash={lastSignedResult.originalHash}
            publicKey={lastSignedResult.publicKey}
            signature={lastSignedResult.signature}
            qrDataUrl={lastSignedResult.qrDataUrl}
            isValid={true}
          />
        </div>
      )}
    </div>
  );
};
