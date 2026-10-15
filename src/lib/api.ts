import type { ApiResult, RegisterOptionsData, RegisterVerifyData, User } from './types';

// Cho phép dùng đường dẫn tương đối (Vite Proxy) hoặc gọi trực tiếp backend port 5105
export const DEFAULT_API_URL = 'http://localhost:5105';

export function getBaseApiUrl(): string {
  const custom = localStorage.getItem('edupasskey_api_url');
  if (custom) return custom.trim();
  // Ưu tiên dùng đường dẫn tương đối để Vite proxy xử lý mượt mà CORS
  return '';
}

export function setBaseApiUrl(url: string) {
  if (!url || url.trim() === '') {
    localStorage.removeItem('edupasskey_api_url');
  } else {
    localStorage.setItem('edupasskey_api_url', url.trim());
  }
}

/**
 * Wrapper gọi fetch có kèm Cookie (credentials: 'include')
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const baseUrl = getBaseApiUrl();
  const url = `${baseUrl}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'include', // BẮT BUỘC để nhận & gửi Set-Cookie StudentPortal.Auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      // Nếu API trả về định dạng chuẩn Result<T>: { isSuccess, value, error }
      if (typeof data.isSuccess === 'boolean') {
        return data as ApiResult<T>;
      }
      if (res.ok) {
        return { isSuccess: true, value: data as T };
      }
      return {
        isSuccess: false,
        error: {
          code: data.code || `HTTP_${res.status}`,
          message: data.message || res.statusText || 'Yêu cầu không thành công.',
        },
      };
    }

    if (res.ok) {
      return { isSuccess: true, value: undefined as unknown as T };
    }

    const text = await res.text();
    return {
      isSuccess: false,
      error: {
        code: `HTTP_${res.status}`,
        message: text || `Lỗi HTTP ${res.status}: ${res.statusText}`,
      },
    };
  } catch (err: any) {
    return {
      isSuccess: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err.message || 'Không thể kết nối đến máy chủ Backend (hãy kiểm tra xem backend .NET đã chạy chưa).',
      },
    };
  }
}

/**
 * Kiểm tra kết nối với Backend
 */
export async function checkBackendHealth(): Promise<{ isOnline: boolean; message: string }> {
  try {
    const baseUrl = getBaseApiUrl();
    const target = baseUrl ? `${baseUrl}/` : '/';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(target, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok || res.status === 404 || res.status === 302 || res.status === 200) {
      return { isOnline: true, message: 'Backend .NET đang hoạt động' };
    }
    return { isOnline: false, message: `Mã phản hồi HTTP: ${res.status}` };
  } catch {
    return { isOnline: false, message: 'Chưa kết nối Backend (Port 5105)' };
  }
}

/**
 * 1. POST /api/v1/auth/register/options
 */
export async function requestRegisterOptions(params: {
  studentCode: string;
  fullName: string;
  email: string;
}): Promise<ApiResult<RegisterOptionsData>> {
  return await apiFetch<RegisterOptionsData>('/api/v1/auth/register/options', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * 2. POST /api/v1/auth/register/verify
 */
export async function verifyRegister(params: {
  ceremonyId: string;
  deviceName?: string;
  credential: any;
}): Promise<ApiResult<RegisterVerifyData>> {
  return await apiFetch<RegisterVerifyData>('/api/v1/auth/register/verify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * 3. POST /api/v1/auth/login/options
 */
export async function requestLoginOptions(params?: {
  studentCode?: string;
}): Promise<ApiResult<any>> {
  return await apiFetch<any>('/api/v1/auth/login/options', {
    method: 'POST',
    body: JSON.stringify(params || {}),
  });
}

/**
 * 4. POST /api/v1/auth/login/verify
 */
export async function verifyLogin(params: {
  ceremonyId: string;
  credential: any;
}): Promise<ApiResult<{ user: User }>> {
  return await apiFetch<{ user: User }>('/api/v1/auth/login/verify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * 5. GET /api/v1/auth/me
 */
export async function getMe(): Promise<ApiResult<User>> {
  return await apiFetch<User>('/api/v1/auth/me', {
    method: 'GET',
  });
}

/**
 * 6. POST /api/v1/auth/logout
 */
export async function logout(): Promise<ApiResult<void>> {
  return await apiFetch<void>('/api/v1/auth/logout', {
    method: 'POST',
  });
}
