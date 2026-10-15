import {
  startRegistration as swStartRegistration,
  startAuthentication as swStartAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser';

/**
 * Kiểm tra xem trình duyệt và thiết bị hiện tại có hỗ trợ Passkey / WebAuthn không
 */
export async function checkDevicePasskeyCapability(): Promise<{
  supported: boolean;
  hasPlatformAuthenticator: boolean;
  summary: string;
}> {
  const supported = browserSupportsWebAuthn();
  if (!supported) {
    return {
      supported: false,
      hasPlatformAuthenticator: false,
      summary: 'Trình duyệt hiện tại không hỗ trợ chuẩn WebAuthn / Passkeys.',
    };
  }

  let hasPlatform = false;
  try {
    hasPlatform = await platformAuthenticatorIsAvailable();
  } catch {
    hasPlatform = false;
  }

  return {
    supported: true,
    hasPlatformAuthenticator: hasPlatform,
    summary: hasPlatform
      ? 'Thiết bị sẵn sàng: Có cảm biến sinh trắc học (Windows Hello / Touch ID / Face ID).'
      : 'Thiết bị hỗ trợ Passkeys qua mã PIN máy hoặc quét mã QR qua điện thoại (Hybrid Flow).',
  };
}

/**
 * Tự động gợi ý tên thiết bị mặc định dựa trên hệ điều hành
 */
export function getDefaultDeviceName(): string {
  const userAgent = navigator.userAgent;
  if (/Windows/i.test(userAgent)) return 'Windows Hello (Laptop/PC)';
  if (/Macintosh|Mac OS/i.test(userAgent)) return 'Touch ID (MacBook)';
  if (/iPhone|iPad/i.test(userAgent)) return 'Face ID / Touch ID (Apple)';
  if (/Android/i.test(userAgent)) return 'Vân tay sinh trắc học (Android)';
  if (/Linux/i.test(userAgent)) return 'Bảo mật phần cứng (Linux)';
  return 'Khóa Passkey cá nhân';
}

/**
 * Chuẩn hóa Base64 / Base64URL sang chuỗi Base64URL chuẩn
 */
export function toBase64Url(input: string | Uint8Array | number[]): string {
  if (Array.isArray(input)) {
    input = new Uint8Array(input);
  }
  if (input instanceof Uint8Array) {
    let binary = '';
    for (let i = 0; i < input.byteLength; i++) {
      binary += String.fromCharCode(input[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  if (typeof input === 'string') {
    return input.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return '';
}

/**
 * Giải mã chuỗi Base64URL thành UTF-8 string (dùng soi clientDataJSON)
 */
export function decodeBase64UrlToString(base64url: string): string {
  try {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return '(Không thể giải mã)';
  }
}

/**
 * Chuẩn hóa CredentialCreateOptions từ C# Fido2-net-lib trước khi đưa vào @simplewebauthn/browser
 */
export function normalizeCreationOptions(rawOptions: any): any {
  const opts = { ...rawOptions };

  // Đảm bảo challenge là base64url string
  if (opts.challenge) {
    opts.challenge = toBase64Url(opts.challenge);
  }

  // Đảm bảo user.id là base64url string
  if (opts.user && opts.user.id) {
    opts.user = {
      ...opts.user,
      id: toBase64Url(opts.user.id),
    };
  }

  // Đảm bảo excludeCredentials có id là base64url
  if (Array.isArray(opts.excludeCredentials)) {
    opts.excludeCredentials = opts.excludeCredentials.map((c: any) => ({
      ...c,
      id: toBase64Url(c.id),
    }));
  }

  return opts;
}

/**
 * Kích hoạt popup WebAuthn trên trình duyệt để Đăng ký Passkey
 */
export async function startPasskeyRegistration(options: any) {
  try {
    const normalizedOptions = normalizeCreationOptions(options);
    const credential = await swStartRegistration({ optionsJSON: normalizedOptions });
    return credential;
  } catch (error: any) {
    throw new Error(translateWebAuthnError(error));
  }
}

/**
 * Chuẩn hóa AssertionOptions từ C# Fido2-net-lib trước khi đưa vào @simplewebauthn/browser
 */
export function normalizeAssertionOptions(rawOptions: any): any {
  const opts = { ...rawOptions };

  // Đảm bảo challenge là base64url string
  if (opts.challenge) {
    opts.challenge = toBase64Url(opts.challenge);
  }

  // Đảm bảo allowCredentials có id là base64url string
  if (Array.isArray(opts.allowCredentials)) {
    opts.allowCredentials = opts.allowCredentials.map((c: any) => ({
      ...c,
      id: toBase64Url(c.id),
    }));
  }

  return opts;
}

/**
 * Kích hoạt popup WebAuthn trên trình duyệt để Đăng nhập Passkey
 */
export async function startPasskeyAuthentication(options: any) {
  try {
    const normalizedOptions = normalizeAssertionOptions(options);
    const credential = await swStartAuthentication({ optionsJSON: normalizedOptions });
    return credential;
  } catch (error: any) {
    throw new Error(translateWebAuthnError(error));
  }
}

/**
 * Dịch các mã lỗi WebAuthn của W3C sang tiếng Việt rõ ràng, dễ hiểu
 */
export function translateWebAuthnError(err: any): string {
  const name = err.name || '';
  const msg = err.message || '';

  if (name === 'NotAllowedError' || msg.includes('not allowed')) {
    return 'Người dùng đã hủy xác thực sinh trắc học hoặc phiên quét đã hết thời gian chờ.';
  }
  if (name === 'InvalidStateError' || msg.includes('already registered')) {
    return 'Thiết bị này hoặc khóa Passkey này đã được đăng ký trong hệ thống trước đó.';
  }
  if (name === 'SecurityError' || msg.includes('origin') || msg.includes('RP ID')) {
    return 'LỖI BẢO MẬT: Tên miền hoặc RP ID không khớp! Cơ chế chống Phishing của FIDO2 đã ngăn chặn yêu cầu này.';
  }
  if (name === 'AbortError') {
    return 'Yêu cầu xác thực đã bị hủy bỏ.';
  }
  if (name === 'ConstraintError') {
    return 'Thiết bị của bạn không đáp ứng yêu cầu xác thực bảo mật của hệ thống.';
  }
  return msg || 'Đã xảy ra lỗi trong quá trình giao tiếp với cảm biến bảo mật.';
}
