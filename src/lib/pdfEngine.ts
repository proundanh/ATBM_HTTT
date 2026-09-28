import {
  PDFDocument,
  StandardFonts,
  rgb,
  PageSizes,
  PDFName,
  PDFDict,
  PDFArray,
  PDFString,
  PDFRawStream,
  decodePDFRawStream,
} from 'pdf-lib';
import QRCode from 'qrcode';
import {
  sha256,
  signHash,
  verifySignature,
  getPublicKeyFromPrivate,
} from './crypto.ts';

export interface CreateSignedPdfParams {
  originalFileBytes: Uint8Array;
  fileName: string;
  signerName: string;
  signerRole?: string;
  reason?: string;
  privateKeyBase64: string;
}

export interface VerificationResult {
  isValid: boolean;
  originalHash: string;
  recalculatedHash: string;
  signerName: string;
  signerRole?: string;
  reason?: string;
  fileName?: string;
  timestamp: string;
  publicKey: string;
  signature: string;
  extractedFileBytes?: Uint8Array;
  tamperReason?: string;
}

interface StoredMetadata {
  originalHash: string;
  signature: string;
  publicKey: string;
  signerName: string;
  signerRole?: string;
  reason?: string;
  timestamp: string;
  fileName?: string;
}

/**
 * Normalizes text to ASCII safe characters for rendering with StandardFonts (WinAnsi).
 * Preserves visual readability without crashing on Vietnamese diacritics.
 */
function sanitizeForPdf(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đ]/g, 'd')
    .replace(/[Đ]/g, 'D')
    .replace(/[^\x20-\x7E]/g, '');
}

/**
 * Extracts an embedded file attachment by name from a loaded PDFDocument.
 */
function extractAttachment(
  doc: PDFDocument,
  targetName = 'original_source.pdf'
): Uint8Array | null {
  try {
    const namesRef = doc.catalog.get(PDFName.of('Names'));
    if (!namesRef) return null;

    const Names = doc.context.lookup(namesRef);
    if (!(Names instanceof PDFDict)) return null;

    const embeddedFilesRef = Names.get(PDFName.of('EmbeddedFiles'));
    if (!embeddedFilesRef) return null;

    const EmbeddedFiles = doc.context.lookup(embeddedFilesRef);
    if (!(EmbeddedFiles instanceof PDFDict)) return null;

    const namesArrRef = EmbeddedFiles.get(PDFName.of('Names'));
    if (!namesArrRef) return null;

    const NamesArr = doc.context.lookup(namesArrRef);
    if (!(NamesArr instanceof PDFArray)) return null;

    for (let i = 0; i < NamesArr.size(); i += 2) {
      const nameObj = NamesArr.get(i);
      const nameStr =
        (nameObj as { decodeText?: () => string }).decodeText?.() ||
        (nameObj as { asString?: () => string }).asString?.() ||
        nameObj.toString();

      const fileSpecRef = NamesArr.get(i + 1);
      const fileSpec = doc.context.lookup(fileSpecRef);
      if (!(fileSpec instanceof PDFDict)) continue;

      const fObj = doc.context.lookup(fileSpec.get(PDFName.of('F')));
      const ufObj = doc.context.lookup(fileSpec.get(PDFName.of('UF')));
      const fname =
        (ufObj as { decodeText?: () => string } | undefined)?.decodeText?.() ||
        (fObj as { asString?: () => string } | undefined)?.asString?.() ||
        '';

      if (
        nameStr.includes(targetName) ||
        fname.includes(targetName) ||
        NamesArr.size() === 2
      ) {
        const efRef = fileSpec.get(PDFName.of('EF'));
        const EF = doc.context.lookup(efRef);
        if (!(EF instanceof PDFDict)) continue;

        const streamRef = EF.get(PDFName.of('F')) || EF.get(PDFName.of('UF'));
        if (!streamRef) continue;

        const rawStream = doc.context.lookup(streamRef);
        if (!rawStream) continue;

        return decodePDFRawStream(rawStream as any).decode();
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting PDF attachment:', error);
    return null;
  }
}

/**
 * Extracts and concatenates all decoded content stream bytes for a given page.
 */
function getPageContentBytes(page: any, doc: PDFDocument): Uint8Array {
  const contentsRef = page.node.get(PDFName.of('Contents'));
  if (!contentsRef) return new Uint8Array(0);

  const contentsObj = doc.context.lookup(contentsRef);
  if (!contentsObj) return new Uint8Array(0);

  const streams: any[] = [];
  if (contentsObj instanceof PDFArray) {
    for (let i = 0; i < contentsObj.size(); i++) {
      const streamObj = doc.context.lookup(contentsObj.get(i));
      if (streamObj) streams.push(streamObj);
    }
  } else {
    streams.push(contentsObj);
  }

  const chunks: Uint8Array[] = [];
  for (const stream of streams) {
    if (stream instanceof PDFRawStream) {
      try {
        const decoded = decodePDFRawStream(stream).decode();
        chunks.push(decoded);
      } catch {
        chunks.push(stream.getContents());
      }
    } else if (stream && typeof stream.getContents === 'function') {
      chunks.push(stream.getContents());
    }
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

/**
 * Serializes the annotations (/Annots) of a page (e.g. ink drawings, highlights, text notes).
 */
function getPageAnnotationsRepresentation(page: any, doc: PDFDocument): string {
  const annotsRef = page.node.get(PDFName.of('Annots'));
  if (!annotsRef) return '';
  const annotsObj = doc.context.lookup(annotsRef);
  if (!(annotsObj instanceof PDFArray)) return '';
  let rep = '';
  for (let i = 0; i < annotsObj.size(); i++) {
    const annot = doc.context.lookup(annotsObj.get(i));
    if (annot) rep += annot.toString();
  }
  return rep;
}

/**
 * Computes a SHA-256 fingerprint of a page including its content streams and annotations.
 */
async function getPageFingerprint(page: any, doc: PDFDocument): Promise<string> {
  const contentBytes = getPageContentBytes(page, doc);
  const annotsRep = getPageAnnotationsRepresentation(page, doc);
  const annotsBytes = new TextEncoder().encode(annotsRep);

  const combined = new Uint8Array(contentBytes.length + annotsBytes.length);
  combined.set(contentBytes, 0);
  combined.set(annotsBytes, contentBytes.length);
  return await sha256(combined);
}

/**
 * Sprint 3 - createSignedPdf
 * 1. Hashes originalFileBytes to get originalHash (Hex).
 * 2. Signs originalHash with privateKeyBase64 -> signature (Base64).
 * 3. Loads originalFileBytes into PDFDocument.
 * 4. Attaches originalFileBytes as 'original_source.pdf' (100% bit-exact).
 * 5. Generates QR Code DataURL containing { h, s, p, n }.
 * 6. Adds a professional A4 Audit Trail page at the end.
 * 7. Writes metadata to document properties.
 * 8. Returns completed signed PDF bytes.
 */
export async function createSignedPdf(
  params: CreateSignedPdfParams
): Promise<Uint8Array> {
  const {
    originalFileBytes,
    fileName,
    signerName,
    signerRole = 'Signer / Auditor',
    reason = 'Document Authenticity & Integrity Audit',
    privateKeyBase64,
  } = params;

  // 1. Calculate SHA-256 hash of the original unedited file
  const originalHash = await sha256(originalFileBytes);

  // 2. Derive Public Key and sign the SHA-256 hash
  const publicKey = getPublicKeyFromPrivate(privateKeyBase64);
  const signature = signHash(originalHash, privateKeyBase64);

  // 3. Load the document into pdf-lib
  const pdfDoc = await PDFDocument.load(originalFileBytes, {
    ignoreEncryption: true,
  });

  // 4. Attach original file bytes for bit-exact extraction
  await pdfDoc.attach(originalFileBytes, 'original_source.pdf', {
    mimeType: 'application/pdf',
    description: 'Original unedited document',
    creationDate: new Date(),
    modificationDate: new Date(),
  });

  // 5. Generate QR Code Data URL containing cryptographic proof
  const qrPayload = JSON.stringify({
    h: originalHash,
    s: signature,
    p: publicKey,
    n: signerName,
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
  });
  const qrImage = await pdfDoc.embedPng(qrDataUrl);

  // 6. Embed standard fonts for Audit Trail page
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);

  // 7. Add Audit Trail page (A4: 595.28 x 841.89 pt)
  const auditPage = pdfDoc.addPage(PageSizes.A4);
  const { width, height } = auditPage.getSize();

  // Colors
  const brandGreen = rgb(0.063, 0.725, 0.506); // #10b981
  const brandDark = rgb(0.024, 0.306, 0.231); // #064e3b
  const slate900 = rgb(0.059, 0.090, 0.165); // #0f172a
  const slate600 = rgb(0.278, 0.333, 0.412); // #475569
  const slate300 = rgb(0.796, 0.835, 0.882); // #cbd5e1
  const bgCard = rgb(0.973, 0.980, 0.988); // #f8fafc

  const marginX = 45;
  const contentWidth = width - marginX * 2;
  const startY = height - 50;

  // Header Banner
  auditPage.drawRectangle({
    x: marginX,
    y: startY - 60,
    width: contentWidth,
    height: 60,
    color: slate900,
  });

  auditPage.drawRectangle({
    x: marginX,
    y: startY - 60,
    width: 6,
    height: 60,
    color: brandGreen,
  });

  auditPage.drawText('CHUNG NHAN CHU KY DIEN TU & NHAT KY KIEM TOAN', {
    x: marginX + 20,
    y: startY - 26,
    size: 13,
    font: fontHelveticaBold,
    color: rgb(1, 1, 1),
  });

  auditPage.drawText('CERTIFICATE OF DIGITAL AUDIT TRAIL - ED25519 CRYPTOGRAPHIC PROOF', {
    x: marginX + 20,
    y: startY - 44,
    size: 8.5,
    font: fontHelvetica,
    color: brandGreen,
  });

  // Security Badge
  const badgeY = startY - 95;
  auditPage.drawRectangle({
    x: marginX,
    y: badgeY,
    width: contentWidth,
    height: 25,
    color: rgb(0.941, 0.992, 0.957), // brand-50
    borderColor: brandGreen,
    borderWidth: 1,
  });

  auditPage.drawText(
    'FILE GOC DUOC DINH KEM NGUYEN VEN VA CHUNG THUC BANG MAT MA HOC ED25519',
    {
      x: marginX + 12,
      y: badgeY + 8,
      size: 8.5,
      font: fontHelveticaBold,
      color: brandDark,
    }
  );

  // Legal Information Card
  const cardTop = badgeY - 15;
  const cardHeight = 370;
  auditPage.drawRectangle({
    x: marginX,
    y: cardTop - cardHeight,
    width: contentWidth,
    height: cardHeight,
    color: bgCard,
    borderColor: slate300,
    borderWidth: 1,
  });

  // Table rows configuration
  const signingTimeUtc = new Date().toISOString();
  const truncatedHash = `${originalHash.slice(0, 16)}...${originalHash.slice(-16)}`;
  const truncatedSig = `${signature.slice(0, 20)}...${signature.slice(-20)}`;
  const truncatedPub = `${publicKey.slice(0, 16)}...${publicKey.slice(-16)}`;

  const rows: Array<{ label: string; value: string; isMono?: boolean; subValue?: string }> = [
    { label: 'Ten tep goc (File Name):', value: sanitizeForPdf(fileName) },
    { label: 'Nguoi ky (Signer Name):', value: sanitizeForPdf(signerName) },
    { label: 'Chuc danh (Signer Role):', value: sanitizeForPdf(signerRole) },
    { label: 'Ly do ky (Audit Reason):', value: sanitizeForPdf(reason) },
    { label: 'Thoi diem ky (UTC Time):', value: signingTimeUtc },
    {
      label: 'Thuat toan mat ma (Algo):',
      value: 'Ed25519 (RFC 8032) / SHA-256 (FIPS 180-4)',
    },
    {
      label: 'Ma bam SHA-256 (Hash):',
      value: truncatedHash,
      isMono: true,
      subValue: originalHash,
    },
    {
      label: 'Chu ky so (Signature):',
      value: truncatedSig,
      isMono: true,
      subValue: signature,
    },
    {
      label: 'Khoa cong khai (Public Key):',
      value: truncatedPub,
      isMono: true,
      subValue: publicKey,
    },
  ];

  let currentY = cardTop - 25;
  for (const row of rows) {
    auditPage.drawText(row.label, {
      x: marginX + 15,
      y: currentY,
      size: 9,
      font: fontHelveticaBold,
      color: slate600,
    });

    auditPage.drawText(row.value, {
      x: marginX + 180,
      y: currentY,
      size: 9,
      font: row.isMono ? fontCourier : fontHelvetica,
      color: slate900,
    });

    if (row.subValue) {
      currentY -= 14;
      auditPage.drawText(row.subValue, {
        x: marginX + 180,
        y: currentY,
        size: 7,
        font: fontCourier,
        color: slate600,
      });
    }

    currentY -= 24;
  }

  // QR Code & Verification Instruction Section
  const qrSectionY = cardTop - cardHeight - 20;
  const qrSectionHeight = 150;

  auditPage.drawRectangle({
    x: marginX,
    y: qrSectionY - qrSectionHeight,
    width: contentWidth,
    height: qrSectionHeight,
    color: rgb(1, 1, 1),
    borderColor: slate300,
    borderWidth: 1,
  });

  // Draw QR Image
  const qrSize = 130;
  auditPage.drawImage(qrImage, {
    x: marginX + 15,
    y: qrSectionY - qrSectionHeight + 10,
    width: qrSize,
    height: qrSize,
  });

  // QR Instructions
  const textX = marginX + 160;
  let textY = qrSectionY - 30;

  auditPage.drawText('MA PHAP LY & BANG CHUNG XAC THUC (QR AUDIT PROOF)', {
    x: textX,
    y: textY,
    size: 10,
    font: fontHelveticaBold,
    color: slate900,
  });

  textY -= 18;
  const instructions = [
    '- Quet ma QR de trich xuat bang chung: SHA-256 Hash, Signature va Public Key.',
    '- Tep tin goc da duoc ma hoa dong goi vao luong dinh kem: original_source.pdf.',
    '- Khi kiem tra, he thong se boc tach tep dinh kem de tinh toan lai ma bam.',
    '- Dam bao do chinh xac tuyet doi 100% tung byte (bit-exact preservation).',
    '- Bat ky su thay doi nao tren file goc se lam chu ky mat gia tri lap tuc.',
  ];

  for (const line of instructions) {
    auditPage.drawText(line, {
      x: textX,
      y: textY,
      size: 8,
      font: fontHelvetica,
      color: slate600,
    });
    textY -= 16;
  }

  // Footer Notice
  auditPage.drawText(
    'PDF-Ed25519-Audit System | Trang cuoi: Nhat ky chung thuc phap ly',
    {
      x: marginX,
      y: 35,
      size: 8,
      font: fontHelvetica,
      color: slate600,
    }
  );

  // 8. Write Document Metadata
  const timestamp = signingTimeUtc;
  const metadataObj: StoredMetadata = {
    originalHash,
    signature,
    publicKey,
    signerName,
    signerRole,
    reason,
    timestamp,
    fileName,
  };

  pdfDoc.setTitle(`Audit Verified - ${fileName}`);
  pdfDoc.setAuthor(signerName);
  pdfDoc.setSubject(JSON.stringify(metadataObj));
  pdfDoc.setKeywords([
    'Ed25519-Signed',
    `Hash:${originalHash}`,
    `Signer:${signerName}`,
    `PublicKey:${publicKey}`,
  ]);
  pdfDoc.setProducer('PDF-Ed25519-Audit Engine');
  pdfDoc.setCreator('PDF-Ed25519-Audit System');
  pdfDoc.setModificationDate(new Date());

  // Also write custom fields to the PDF Info Dictionary for resilience
  try {
    const infoRef = pdfDoc.context.trailerInfo.Info;
    if (infoRef) {
      const info = pdfDoc.context.lookup(infoRef, PDFDict);
      if (info) {
        info.set(PDFName.of('Ed25519Hash'), PDFString.of(originalHash));
        info.set(PDFName.of('Ed25519Signature'), PDFString.of(signature));
        info.set(PDFName.of('Ed25519PublicKey'), PDFString.of(publicKey));
        info.set(PDFName.of('SignerName'), PDFString.of(signerName));
        info.set(PDFName.of('SigningTime'), PDFString.of(timestamp));
      }
    }
  } catch (error) {
    console.warn('Warning: Could not set custom Info dict entries:', error);
  }

  // 9. Save and return final signed PDF bytes
  return await pdfDoc.save();
}

/**
 * Sprint 3 & 4 Extended - verifySignedPdf
 * 1. Loads signedPdfBytes into PDFDocument.
 * 2. Checks if file is damaged/corrupted by external text editors (Notepad).
 * 3. Extracts attached 'original_source.pdf'.
 * 4. Recalculates hash: recalculatedHash = await sha256(extractedBytes).
 * 5. Reads signature and publicKey from PDF Metadata.
 * 6. Verifies cryptographic signature with Ed25519.
 * 7. Crucial Defense: Compares visible pages (1 to N-1) against the attached original document
 *    (fingerprinting content streams and annotations) to catch PDF Editor drawings, text edits, or page tampering!
 * 8. Returns VerificationResult.
 */
export async function verifySignedPdf(
  signedPdfBytes: Uint8Array
): Promise<VerificationResult> {
  // 1. Try loading document with pdf-lib
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(signedPdfBytes, {
      ignoreEncryption: true,
    });
  } catch {
    // If PDF fails to parse, check if it was altered by Notepad or text editor
    const textPreview = new TextDecoder('latin1').decode(signedPdfBytes.slice(0, 100000));
    if (
      textPreview.includes('Ed25519') ||
      textPreview.includes('original_source.pdf') ||
      textPreview.includes('Ed25519Signature')
    ) {
      return {
        isValid: false,
        originalHash: '(Không thể đọc do cấu trúc tệp bị hỏng)',
        recalculatedHash: '(Cấu trúc tệp PDF đã bị phá hủy)',
        signerName: 'Tài liệu có dấu hiệu can thiệp',
        timestamp: new Date().toISOString(),
        publicKey: '',
        signature: '',
        tamperReason:
          'Tài liệu đã bị can thiệp nhị phân hoặc chỉnh sửa bằng công cụ ngoài (như Notepad/Text Editor), làm sai lệch byte offset và phá vỡ cấu trúc nhị phân của tệp PDF!',
      };
    }
    throw new Error('Tài liệu không phải file có chứng thực hợp lệ');
  }

  // 2. Retrieve metadata from Subject JSON or Info dictionary
  let originalHash = '';
  let signature = '';
  let publicKey = '';
  let signerName = 'Unknown Signer';
  let signerRole: string | undefined;
  let reason: string | undefined;
  let fileName: string | undefined;
  let timestamp = new Date().toISOString();

  // Try parsing structured metadata from Subject
  const subjectStr = pdfDoc.getSubject();
  let hasAuditMetadata = false;

  if (subjectStr) {
    try {
      const parsed: StoredMetadata = JSON.parse(subjectStr);
      if (parsed.originalHash) {
        originalHash = parsed.originalHash;
        hasAuditMetadata = true;
      }
      if (parsed.signature) signature = parsed.signature;
      if (parsed.publicKey) publicKey = parsed.publicKey;
      if (parsed.signerName) signerName = parsed.signerName;
      if (parsed.signerRole) signerRole = parsed.signerRole;
      if (parsed.reason) reason = parsed.reason;
      if (parsed.fileName) fileName = parsed.fileName;
      if (parsed.timestamp) timestamp = parsed.timestamp;
    } catch {
      // Subject is not JSON; will fallback to Info dictionary
    }
  }

  // Fallback to Info dictionary if fields are missing
  try {
    const infoRef = pdfDoc.context.trailerInfo.Info;
    if (infoRef) {
      const info = pdfDoc.context.lookup(infoRef, PDFDict);
      if (info) {
        if (!originalHash) {
          const hashObj = info.lookup(PDFName.of('Ed25519Hash'));
          if (hashObj && 'asString' in hashObj) {
            originalHash = (hashObj as { asString: () => string }).asString();
            hasAuditMetadata = true;
          }
        }
        if (!signature) {
          const sigObj = info.lookup(PDFName.of('Ed25519Signature'));
          if (sigObj && 'asString' in sigObj) {
            signature = (sigObj as { asString: () => string }).asString();
          }
        }
        if (!publicKey) {
          const pubObj = info.lookup(PDFName.of('Ed25519PublicKey'));
          if (pubObj && 'asString' in pubObj) {
            publicKey = (pubObj as { asString: () => string }).asString();
          }
        }
        if (signerName === 'Unknown Signer') {
          const nameObj = info.lookup(PDFName.of('SignerName'));
          if (nameObj && 'asString' in nameObj) {
            signerName = (nameObj as { asString: () => string }).asString();
          } else {
            const author = pdfDoc.getAuthor();
            if (author) signerName = author;
          }
        }
      }
    }
  } catch (error) {
    console.warn('Warning: Could not read Info dictionary:', error);
  }

  // Check keywords for audit indicators
  const keywords = pdfDoc.getKeywords();
  if (keywords && keywords.includes('Ed25519')) {
    hasAuditMetadata = true;
  }

  // 3. Extract attached original source file
  const extractedBytes = extractAttachment(pdfDoc, 'original_source.pdf');
  if (!extractedBytes || extractedBytes.length === 0) {
    // Check if raw bytes contain markers indicating this was an audit-signed file
    const textRaw = new TextDecoder('latin1').decode(signedPdfBytes.slice(0, 100000));
    const hasAuditMarkerInRaw =
      hasAuditMetadata ||
      textRaw.includes('/EmbeddedFile') ||
      textRaw.includes('EmbeddedFiles') ||
      textRaw.includes('original_source') ||
      textRaw.includes('Ed25519');

    if (hasAuditMarkerInRaw) {
      return {
        isValid: false,
        originalHash: originalHash || '(Không thể bóc tách do tệp bị phá hỏng cấu trúc)',
        recalculatedHash: '(Cấu trúc tệp PDF đã bị phá hủy / Notepad edit)',
        signerName: signerName !== 'Unknown Signer' ? signerName : 'Tài liệu có dấu hiệu can thiệp',
        signerRole,
        reason,
        fileName,
        timestamp,
        publicKey: publicKey || '',
        signature: signature || '',
        tamperReason:
          'Tài liệu có chứng thư chữ ký số nhưng cấu trúc tệp đính kèm (original_source.pdf) đã bị can thiệp, xóa bỏ hoặc phá hỏng cấu trúc nhị phân (do mở và lưu bằng trình soạn thảo văn bản như Notepad)!',
      };
    }
    // Genuine unsigned document
    throw new Error('Tài liệu không phải file có chứng thực hợp lệ');
  }

  // 4. Recalculate SHA-256 hash of the extracted original file
  const recalculatedHash = await sha256(extractedBytes);

  // 5. Verify cryptographic signature of the attachment
  const isHashMatching =
    Boolean(originalHash) &&
    originalHash.toLowerCase() === recalculatedHash.toLowerCase();

  const isSigValid =
    Boolean(signature) &&
    Boolean(publicKey) &&
    verifySignature(recalculatedHash, signature, publicKey);

  if (!isHashMatching || !isSigValid) {
    return {
      isValid: false,
      originalHash: originalHash || recalculatedHash,
      recalculatedHash,
      signerName,
      signerRole,
      reason,
      fileName,
      timestamp,
      publicKey,
      signature,
      extractedFileBytes: extractedBytes,
      tamperReason: !isHashMatching
        ? 'Mã băm SHA-256 của tệp đính kèm không khớp với mã băm trong chứng thư gốc!'
        : 'Chữ ký số Ed25519 không hợp lệ hoặc đã bị giả mạo với khóa công khai!',
    };
  }

  // 6. CRUCIAL CHECK: Verify visible content pages (1 to N-1) against the attached original document!
  // This detects PDF Editor vandalism (drawing, adding text, changing content, adding/deleting pages).
  let origDoc: PDFDocument;
  try {
    origDoc = await PDFDocument.load(extractedBytes, { ignoreEncryption: true });
  } catch {
    return {
      isValid: false,
      originalHash,
      recalculatedHash,
      signerName,
      signerRole,
      reason,
      fileName,
      timestamp,
      publicKey,
      signature,
      extractedFileBytes: extractedBytes,
      tamperReason: 'Tệp đính kèm gốc bị hỏng không thể nạp để đối soát các trang hiển thị!',
    };
  }

  const origPageCount = origDoc.getPageCount();
  const uploadedPageCount = pdfDoc.getPageCount();

  // The signed PDF must contain exactly origPageCount + 1 pages (all original pages + 1 Audit Trail page)
  if (uploadedPageCount !== origPageCount + 1) {
    return {
      isValid: false,
      originalHash,
      recalculatedHash,
      signerName,
      signerRole,
      reason,
      fileName,
      timestamp,
      publicKey,
      signature,
      extractedFileBytes: extractedBytes,
      tamperReason: `Số lượng trang hiển thị (${uploadedPageCount} trang) không khớp với số trang gốc trong chứng thư (${origPageCount} trang gốc + 1 trang kiểm toán)! Phát hiện tài liệu đã bị thêm hoặc bớt trang.`,
    };
  }

  // Compare content streams and annotations of each visible page (pages 0 to origPageCount - 1)
  for (let i = 0; i < origPageCount; i++) {
    const origPage = origDoc.getPage(i);
    const uploadedPage = pdfDoc.getPage(i);

    const origFp = await getPageFingerprint(origPage, origDoc);
    const uploadedFp = await getPageFingerprint(uploadedPage, pdfDoc);

    if (origFp !== uploadedFp) {
      return {
        isValid: false,
        originalHash,
        recalculatedHash,
        signerName,
        signerRole,
        reason,
        fileName,
        timestamp,
        publicKey,
        signature,
        extractedFileBytes: extractedBytes,
        tamperReason: `Phát hiện nội dung hiển thị của tài liệu đã bị can thiệp hoặc chỉnh sửa trái phép (Trang ${i + 1} có thêm nét vẽ, chữ mới hoặc nội dung trang bị khác biệt so với bản gốc trong chứng thư)!`,
      };
    }
  }

  // 7. All cryptographic & visible content checks passed successfully
  return {
    isValid: true,
    originalHash,
    recalculatedHash,
    signerName,
    signerRole,
    reason,
    fileName,
    timestamp,
    publicKey,
    signature,
    extractedFileBytes: extractedBytes,
  };
}
