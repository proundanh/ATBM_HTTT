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

export interface InspectPacket {
  id: string;
  title: string;
  timestamp: string;
  flow: 'register' | 'login' | 'stepup';
  phase: 'Server Options' | 'Client Authenticator' | 'Server Verify Result';
  data: any;
  notes?: string;
}
