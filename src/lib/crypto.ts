/**
 * ============================================================================
 * MODULE: CRYPTO ENGINE (Ed25519 & SHA-256)
 * ============================================================================
 * Dự án: ATBM_HTTT - PDF Ed25519 Cryptographic Audit System
 * 
 * Mục đích & Kiến trúc Mật mã học:
 * 1. Thuật toán Ed25519 (RFC 8032 - Edwards-curve Digital Signature Algorithm):
 *    - Sử dụng đường cong elliptic Twisted Edwards trên trường hữu hạn 2^255 - 19.
 *    - Cung cấp mức an toàn bảo mật 128-bit (tương đương RSA 3072-bit nhưng tốc độ cao hơn rất nhiều).
 *    - Thực thi thời gian hằng số (constant-time arithmetic), chống tấn công kênh kề (side-channel timing attacks).
 *    - Kích thước khóa gọn nhẹ: Private Key (32 bytes), Public Key (32 bytes), Chữ ký (64 bytes).
 * 
 * 2. Hàm băm SHA-256 (FIPS 180-4):
 *    - Sử dụng Web Cryptography API chuẩn của trình duyệt (crypto.subtle.digest).
 *    - Đảm bảo tính kháng va chạm (collision resistance) và hiệu ứng tuyết lở (avalanche effect).
 * 
 * 3. 100% Client-Side:
 *    - Toàn bộ quá trình sinh khóa, băm và ký số diễn ra trực tiếp trong bộ nhớ trình duyệt,
 *      không gửi bất kỳ khóa bí mật hay dữ liệu nào ra mạng Internet.
 * ============================================================================
 */

import { ed25519 } from '@noble/curves/ed25519.js';

export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

/**
 * Chuyển đổi mảng byte Uint8Array thành chuỗi Base64 chuẩn.
 * Áp dụng cho khóa bí mật (32 bytes), khóa công khai (32 bytes) và chữ ký (64 bytes).
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Giải mã chuỗi Base64 thành mảng byte Uint8Array.
 * Tự động cắt bỏ khoảng trắng hoặc ký tự thừa nếu có.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const cleanBase64 = base64.trim();
  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Chuyển đổi chuỗi Hexadecimal (mã băm SHA-256) thành mảng byte Uint8Array (32 bytes).
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.trim().replace(/^0x/i, '');
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string: length must be even');
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    const byte = parseInt(cleanHex.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error(`Invalid hex byte at index ${i}: "${cleanHex.slice(i, i + 2)}"`);
    }
    bytes[i / 2] = byte;
  }
  return bytes;
}

/**
 * Chuyển đổi mảng byte Uint8Array thành chuỗi Hex thường 64 ký tự (dùng hiển thị SHA-256).
 */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Băm nhị phân mảng dữ liệu đầu vào bằng thuật toán SHA-256.
 * Trả về chuỗi Hexadecimal 64 ký tự thường.
 * Sử dụng Web Crypto API (crypto.subtle) tận dụng phần cứng của máy khách.
 */
export async function sha256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Sinh cặp khóa Ed25519 ngẫu nhiên chuẩn an toàn mật mã học (cryptographically secure RNG).
 * - Private Key: 32 bytes ngẫu nhiên, mã hóa Base64.
 * - Public Key: Điểm tọa độ trên đường cong elliptic tương ứng (32 bytes), mã hóa Base64.
 */
export function generateKeyPair(): KeyPair {
  const { secretKey, publicKey } = ed25519.keygen();
  return {
    privateKey: bytesToBase64(secretKey),
    publicKey: bytesToBase64(publicKey),
  };
}

/**
 * Suy xuất Khóa Công Khai (Public Key - Base64) từ Khóa Bí Mật (Private Key - Base64).
 * Phục vụ tính năng tự động hiển thị Public Key ngay khi người dùng nhập hoặc dán Private Key.
 */
export function getPublicKeyFromPrivate(privateKeyBase64: string): string {
  const privateKeyBytes = base64ToBytes(privateKeyBase64);
  if (privateKeyBytes.length !== 32) {
    throw new Error(`Invalid private key length: expected 32 bytes, got ${privateKeyBytes.length}`);
  }
  const publicKeyBytes = ed25519.getPublicKey(privateKeyBytes);
  return bytesToBase64(publicKeyBytes);
}

/**
 * Thực hiện ký số Ed25519 lên giá trị băm SHA-256 của tài liệu:
 * 1. Chuyển đổi chuỗi hashHex (64 ký tự) thành mảng 32 bytes nhị phân.
 * 2. Ký EdDSA bằng private key (32 bytes).
 * 3. Trả về chữ ký số Base64 (64 bytes = 512 bits).
 */
export function signHash(hashHex: string, privateKeyBase64: string): string {
  const hashBytes = hexToBytes(hashHex);
  if (hashBytes.length !== 32) {
    throw new Error(`Invalid SHA-256 hash length: expected 32 bytes, got ${hashBytes.length}`);
  }
  const privateKeyBytes = base64ToBytes(privateKeyBase64);
  if (privateKeyBytes.length !== 32) {
    throw new Error(`Invalid private key length: expected 32 bytes, got ${privateKeyBytes.length}`);
  }
  const signatureBytes = ed25519.sign(hashBytes, privateKeyBytes);
  return bytesToBase64(signatureBytes);
}

/**
 * Kiểm tra tính hợp lệ của chữ ký số Ed25519:
 * - Đầu vào: Mã băm SHA-256 của tài liệu cần kiểm tra, chữ ký số và khóa công khai của người ký.
 * - Trả về `true` nếu chữ ký toàn vẹn và hợp lệ, `false` nếu dữ liệu hoặc chữ ký bị sửa đổi dù chỉ 1 bit.
 */
export function verifySignature(
  hashHex: string,
  signatureBase64: string,
  publicKeyBase64: string
): boolean {
  try {
    const hashBytes = hexToBytes(hashHex);
    if (hashBytes.length !== 32) {
      return false;
    }
    const signatureBytes = base64ToBytes(signatureBase64);
    if (signatureBytes.length !== 64) {
      return false;
    }
    const publicKeyBytes = base64ToBytes(publicKeyBase64);
    if (publicKeyBytes.length !== 32) {
      return false;
    }
    return ed25519.verify(signatureBytes, hashBytes, publicKeyBytes);
  } catch {
    return false;
  }
}
