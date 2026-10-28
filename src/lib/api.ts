import type {
  ApiResult,
  RegisterOptionsData,
  RegisterVerifyData,
  LoginOptionsData,
  LoginVerifyData,
  StepUpOptionsData,
  StepUpVerifyData,
  ProfileData,
  UpdateProfilePayload,
  CredentialItem,
  PagedSecurityLogs,
  PagedAdminStudents,
  PagedAdminLogs,
  User,
} from './types';

export const DEFAULT_API_URL = 'http://localhost:5105';

export function getBaseApiUrl(): string {
  const custom = localStorage.getItem('edupasskey_api_url');
  if (custom) return custom.trim();
  // Sử dụng đường dẫn tương đối để tận dụng Vite proxy sang http://localhost:5105
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
        message: err.message || 'Không thể kết nối đến máy chủ Backend (Port 5105).',
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
    const target = baseUrl ? `${baseUrl}/api/v1/auth/me` : '/api/v1/auth/me';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(target, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok || res.status === 401 || res.status === 200) {
      return { isOnline: true, message: 'Backend .NET đang hoạt động' };
    }
    return { isOnline: false, message: `Mã phản hồi HTTP: ${res.status}` };
  } catch {
    return { isOnline: false, message: 'Chưa kết nối Backend (Port 5105)' };
  }
}

// ──────────────────────────────────────────────────────────────
// Nhóm 1: Xác thực (Auth)
// ──────────────────────────────────────────────────────────────

/** 1. POST /api/v1/auth/register/options */
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

/** 2. POST /api/v1/auth/register/verify */
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

/** 3. POST /api/v1/auth/login/options */
export async function requestLoginOptions(params?: {
  studentCode?: string;
}): Promise<ApiResult<LoginOptionsData>> {
  return await apiFetch<LoginOptionsData>('/api/v1/auth/login/options', {
    method: 'POST',
    body: JSON.stringify(params || {}),
  });
}

/** 4. POST /api/v1/auth/login/verify */
export async function verifyLogin(params: {
  ceremonyId: string;
  credential: any;
}): Promise<ApiResult<LoginVerifyData>> {
  return await apiFetch<LoginVerifyData>('/api/v1/auth/login/verify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/** 5. POST /api/v1/auth/logout */
export async function logout(): Promise<ApiResult<void>> {
  return await apiFetch<void>('/api/v1/auth/logout', {
    method: 'POST',
  });
}

/** 6. GET /api/v1/auth/me */
export async function getMe(): Promise<ApiResult<User>> {
  return await apiFetch<User>('/api/v1/auth/me', {
    method: 'GET',
  });
}

/** 7. POST /api/v1/auth/stepup/options */
export async function requestStepUpOptions(params: {
  action: string;
  payload: any;
}): Promise<ApiResult<StepUpOptionsData>> {
  return await apiFetch<StepUpOptionsData>('/api/v1/auth/stepup/options', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/** 8. POST /api/v1/auth/stepup/verify */
export async function verifyStepUp(params: {
  ceremonyId: string;
  credential: any;
}): Promise<ApiResult<StepUpVerifyData>> {
  return await apiFetch<StepUpVerifyData>('/api/v1/auth/stepup/verify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ──────────────────────────────────────────────────────────────
// Nhóm 2: Hồ sơ sinh viên (Profile)
// ──────────────────────────────────────────────────────────────

/** 14. GET /api/v1/profile */
export async function getProfile(): Promise<ApiResult<ProfileData>> {
  return await apiFetch<ProfileData>('/api/v1/profile', {
    method: 'GET',
  });
}

/** 15. PUT /api/v1/profile (kèm Header X-StepUp-Token) */
export async function updateProfile(
  payload: UpdateProfilePayload,
  stepUpToken: string
): Promise<ApiResult<ProfileData>> {
  return await apiFetch<ProfileData>('/api/v1/profile', {
    method: 'PUT',
    headers: {
      'X-StepUp-Token': stepUpToken,
    },
    body: JSON.stringify(payload),
  });
}

// ──────────────────────────────────────────────────────────────
// Nhóm 3: Thiết bị bảo mật (Credentials)
// ──────────────────────────────────────────────────────────────

/** 9. GET /api/v1/credentials */
export async function getCredentials(): Promise<ApiResult<CredentialItem[]>> {
  return await apiFetch<CredentialItem[]>('/api/v1/credentials', {
    method: 'GET',
  });
}

/** 10. POST /api/v1/credentials/options */
export async function requestAddCredentialOptions(): Promise<ApiResult<{ ceremonyId: string; options: any }>> {
  return await apiFetch<{ ceremonyId: string; options: any }>('/api/v1/credentials/options', {
    method: 'POST',
  });
}

/** 11. POST /api/v1/credentials/verify */
export async function verifyAddCredential(params: {
  ceremonyId: string;
  deviceName?: string;
  credential: any;
}): Promise<ApiResult<CredentialItem>> {
  return await apiFetch<CredentialItem>('/api/v1/credentials/verify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/** 12. PATCH /api/v1/credentials/{id} */
export async function renameCredential(id: string, deviceName: string): Promise<ApiResult<CredentialItem>> {
  return await apiFetch<CredentialItem>(`/api/v1/credentials/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ deviceName }),
  });
}

/** 13. DELETE /api/v1/credentials/{id} (kèm Header X-StepUp-Token) */
export async function revokeCredential(id: string, stepUpToken: string): Promise<ApiResult<void>> {
  return await apiFetch<void>(`/api/v1/credentials/${id}`, {
    method: 'DELETE',
    headers: {
      'X-StepUp-Token': stepUpToken,
    },
  });
}

// ──────────────────────────────────────────────────────────────
// Nhóm 4: Nhật ký bảo mật (Security Logs)
// ──────────────────────────────────────────────────────────────

/** 16. GET /api/v1/security-logs */
export async function getSecurityLogs(params?: {
  page?: number;
  pageSize?: number;
  isSuccess?: boolean;
  eventType?: number;
}): Promise<ApiResult<PagedSecurityLogs>> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
  if (typeof params?.isSuccess === 'boolean') query.append('isSuccess', params.isSuccess.toString());
  if (params?.eventType !== undefined) query.append('eventType', params.eventType.toString());

  return await apiFetch<PagedSecurityLogs>(`/api/v1/security-logs?${query.toString()}`, {
    method: 'GET',
  });
}

// ──────────────────────────────────────────────────────────────
// Nhóm 5: Quản trị viên (Admin)
// ──────────────────────────────────────────────────────────────

/** 17. GET /api/v1/admin/students */
export async function getAdminStudents(params?: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ApiResult<PagedAdminStudents>> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.pageSize) query.append('pageSize', params.pageSize.toString());

  return await apiFetch<PagedAdminStudents>(`/api/v1/admin/students?${query.toString()}`, {
    method: 'GET',
  });
}

/** 18. GET /api/v1/admin/security-logs */
export async function getAdminLogs(params?: {
  studentCode?: string;
  isSuccess?: boolean;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<ApiResult<PagedAdminLogs>> {
  const query = new URLSearchParams();
  if (params?.studentCode) query.append('studentCode', params.studentCode);
  if (typeof params?.isSuccess === 'boolean') query.append('isSuccess', params.isSuccess.toString());
  if (params?.from) query.append('from', params.from);
  if (params?.to) query.append('to', params.to);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.pageSize) query.append('pageSize', params.pageSize.toString());

  return await apiFetch<PagedAdminLogs>(`/api/v1/admin/security-logs?${query.toString()}`, {
    method: 'GET',
  });
}
