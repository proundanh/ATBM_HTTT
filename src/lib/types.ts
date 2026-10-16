export interface User {
  id: string;
  studentCode: string;
  fullName: string;
  email?: string;
  role: string;
}

export interface CredentialDto {
  id: string;
  deviceName: string;
  createdAt: string;
}

export interface ApiResult<T> {
  isSuccess: boolean;
  value?: T;
  error?: {
    code: string;
    message: string;
    errors?: Array<{ field: string; message: string }>;
  };
}

export interface RegisterOptionsData {
  ceremonyId: string;
  options: any;
}

export interface RegisterVerifyData {
  user: User;
  credential: CredentialDto;
}

export interface LoginOptionsData {
  ceremonyId: string;
  options: any;
}

export interface LoginVerifyData {
  user: User;
}

export interface StepUpOptionsData {
  ceremonyId: string;
  options: any;
}

export interface StepUpVerifyData {
  stepUpToken: string;
  expiresInSeconds: number;
}

export interface ProfileData {
  studentCode: string;
  fullName: string;
  email: string;
  class?: string;
  major?: string;
  phone?: string;
  scholarshipAccount?: string;
  updatedAt: string;
}

export interface UpdateProfilePayload {
  phone?: string;
  email: string;
  scholarshipAccount?: string;
}

export interface CredentialItem {
  id: string;
  deviceName?: string;
  createdAt: string;
  lastUsedAt?: string;
  backupEligible: boolean;
  backupState: boolean;
  transports: string[];
  aaguid?: string;
  isCurrent: boolean;
}

export interface SecurityLogItem {
  id: number;
  eventType: string;
  isSuccess: boolean;
  failureReason?: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  signCountUsed?: number;
  timestamp: string;
}

export interface PagedSecurityLogs {
  items: SecurityLogItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AdminStudentItem {
  userId: string;
  studentCode: string;
  fullName: string;
  email: string;
  class?: string;
  major?: string;
  isActive: boolean;
  credentialCount: number;
  lastLoginAt?: string;
}

export interface PagedAdminStudents {
  items: AdminStudentItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AdminSecurityLogItem {
  id: number;
  studentCode?: string;
  studentCodeAttempted?: string;
  eventType: string;
  isSuccess: boolean;
  failureReason?: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  signCountUsed?: number;
  timestamp: string;
}

export interface PagedAdminLogs {
  items: AdminSecurityLogItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface InspectPacket {
  id: string;
  title: string;
  timestamp: string;
  flow: 'register' | 'login' | 'stepup' | 'credentials';
  phase: 'Server Options' | 'Client Authenticator' | 'Server Verify Result';
  data: any;
  notes?: string;
}
