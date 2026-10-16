import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Laptop,
  CheckCircle2,
  XCircle,
  Key,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import type { AdminStudentItem, AdminSecurityLogItem, User } from '../lib/types';
import { getAdminStudents, getAdminLogs } from '../lib/api';

interface AdminTabProps {
  user: User;
}

export const AdminTab = ({ user }: AdminTabProps) => {
  const [subTab, setSubTab] = useState<'students' | 'logs'>('students');

  // Students state
  const [students, setStudents] = useState<AdminStudentItem[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [studentTotal, setStudentTotal] = useState(0);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  // Logs state
  const [adminLogs, setAdminLogs] = useState<AdminSecurityLogItem[]>([]);
  const [logStudentCode, setLogStudentCode] = useState('');
  const [logSuccess, setLogSuccess] = useState<string>('all');
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const PAGE_SIZE = 15;

  useEffect(() => {
    if (subTab === 'students') {
      fetchStudents();
    } else {
      fetchAdminLogs();
    }
  }, [subTab, studentPage, logPage, logSuccess]);

  const fetchStudents = async () => {
    setIsLoadingStudents(true);
    setStudentError(null);
    try {
      const res = await getAdminStudents({
        search: studentSearch.trim() || undefined,
        page: studentPage,
        pageSize: PAGE_SIZE,
      });

      if (res.isSuccess && res.value) {
        setStudents(res.value.items);
        setStudentTotal(res.value.total);
      } else {
        setStudentError(res.error?.message || 'Không thể tải danh sách sinh viên.');
      }
    } catch {
      setStudentError('Lỗi kết nối khi tải danh sách quản trị.');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleSearchStudents = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentPage(1);
    fetchStudents();
  };

  const fetchAdminLogs = async () => {
    setIsLoadingLogs(true);
    setLogError(null);

    const isSuccessParam =
      logSuccess === 'all' ? undefined : logSuccess === 'true';

    try {
      const res = await getAdminLogs({
        studentCode: logStudentCode.trim() || undefined,
        isSuccess: isSuccessParam,
        page: logPage,
        pageSize: PAGE_SIZE,
      });

      if (res.isSuccess && res.value) {
        setAdminLogs(res.value.items);
        setLogTotal(res.value.total);
      } else {
        setLogError(res.error?.message || 'Không thể tải nhật ký an ninh hệ thống.');
      }
    } catch {
      setLogError('Lỗi kết nối khi tải nhật ký quản trị viên.');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSearchLogs = (e: React.FormEvent) => {
    e.preventDefault();
    setLogPage(1);
    fetchAdminLogs();
  };

  const studentTotalPages = Math.ceil(studentTotal / PAGE_SIZE) || 1;
  const logTotalPages = Math.ceil(logTotal / PAGE_SIZE) || 1;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Bảng Điều Khiển Quản Trị Viên (Admin Portal)
              </h1>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {user.role}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Giám sát toàn bộ sinh viên, các khóa Passkey và luồng bảo mật trên toàn máy chủ
            </p>
          </div>
        </div>

        {/* View switcher */}
        <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
          <button
            onClick={() => setSubTab('students')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center space-x-1.5 ${
              subTab === 'students'
                ? 'bg-white text-gray-900 font-semibold shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Danh sách Sinh viên</span>
          </button>

          <button
            onClick={() => setSubTab('logs')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center space-x-1.5 ${
              subTab === 'logs'
                ? 'bg-white text-gray-900 font-semibold shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Nhật ký Toàn trường</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: STUDENTS DIRECTORY */}
      {subTab === 'students' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <form onSubmit={handleSearchStudents} className="flex-1 w-full flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Tìm kiếm theo MSSV, Họ và tên hoặc Email..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shrink-0"
              >
                Tìm kiếm
              </button>
            </form>

            <button
              onClick={fetchStudents}
              disabled={isLoadingStudents}
              className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 text-xs flex items-center space-x-1 shrink-0"
              title="Làm mới"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStudents ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>

          {studentError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{studentError}</span>
            </div>
          )}

          {/* Students Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[11px]">
                    <th className="py-3 px-4">MSSV</th>
                    <th className="py-3 px-4">Họ và Tên</th>
                    <th className="py-3 px-4">Lớp / Ngành</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4 text-center">Số Passkey</th>
                    <th className="py-3 px-4">Đăng nhập gần nhất</th>
                    <th className="py-3 px-4 text-right">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoadingStudents && students.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                        Đang nạp danh sách sinh viên...
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        Không tìm thấy sinh viên nào theo từ khóa tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    students.map((st) => (
                      <tr key={st.userId} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {st.studentCode}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-900">
                          {st.fullName}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          <div>{st.class || 'D21-CQCN01'}</div>
                          <div className="text-[10px] text-gray-400">{st.major || 'An toàn Thông tin'}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                          {st.email}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[11px] border border-blue-200">
                            <Key className="w-3 h-3" />
                            <span>{st.credentialCount} thiết bị</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-[11px] font-mono">
                          {st.lastLoginAt ? new Date(st.lastLoginAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {st.isActive ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-700 font-medium text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Hoạt động</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-gray-500 font-medium text-[11px] bg-gray-100 px-2 py-0.5 rounded-full">
                              Đã khóa
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between text-xs">
              <button
                onClick={() => setStudentPage((p) => Math.max(p - 1, 1))}
                disabled={studentPage <= 1 || isLoadingStudents}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center space-x-1 shadow-xs cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trang trước</span>
              </button>

              <span className="text-gray-600 font-medium">
                Trang {studentPage} / {studentTotalPages} (Tổng {studentTotal} sinh viên)
              </span>

              <button
                onClick={() => setStudentPage((p) => Math.min(p + 1, studentTotalPages))}
                disabled={studentPage >= studentTotalPages || isLoadingStudents}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center space-x-1 shadow-xs cursor-pointer"
              >
                <span>Trang sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ALL SYSTEM SECURITY LOGS */}
      {subTab === 'logs' && (
        <div className="space-y-4">
          {/* Search bar & filters */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <form onSubmit={handleSearchLogs} className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={logStudentCode}
                  onChange={(e) => setLogStudentCode(e.target.value)}
                  placeholder="Lọc theo MSSV..."
                  className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <select
                value={logSuccess}
                onChange={(e) => {
                  setLogSuccess(e.target.value);
                  setLogPage(1);
                }}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-blue-600"
              >
                <option value="all">Tất cả kết quả</option>
                <option value="true">Chỉ thành công</option>
                <option value="false">Chỉ thất bại</option>
              </select>

              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shrink-0"
              >
                Lọc
              </button>
            </form>

            <button
              onClick={fetchAdminLogs}
              disabled={isLoadingLogs}
              className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 text-xs flex items-center space-x-1 shrink-0"
              title="Làm mới"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>

          {logError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{logError}</span>
            </div>
          )}

          {/* Logs Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[11px]">
                    <th className="py-3 px-4">Thời Gian</th>
                    <th className="py-3 px-4">MSSV</th>
                    <th className="py-3 px-4">Sự Kiện</th>
                    <th className="py-3 px-4">Thiết Bị / IP</th>
                    <th className="py-3 px-4">Sign Count</th>
                    <th className="py-3 px-4 text-right">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoadingLogs && adminLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                        Đang truy vấn nhật ký kiểm toán toàn trường...
                      </td>
                    </tr>
                  ) : adminLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        Không có dữ liệu nhật ký nào.
                      </td>
                    </tr>
                  ) : (
                    adminLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-gray-900">
                          {log.studentCode || log.studentCodeAttempted || '(Ẩn danh)'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-800">{log.eventType}</div>
                          {log.failureReason && (
                            <div className="text-[10px] text-rose-600 font-mono mt-0.5">
                              Lý do: {log.failureReason}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          <div className="flex items-center space-x-1.5 font-medium text-gray-800">
                            <Laptop className="w-3.5 h-3.5 text-gray-400" />
                            <span>{log.deviceName || 'Trình duyệt Web'}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            IP: {log.ipAddress || '127.0.0.1'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-600">
                          {log.signCountUsed !== null && log.signCountUsed !== undefined ? (
                            <span className="flex items-center space-x-1">
                              <Key className="w-3 h-3 text-blue-600" />
                              <span>#{log.signCountUsed}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {log.isSuccess ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Thành công</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-rose-700 font-semibold text-[11px] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <XCircle className="w-3 h-3" />
                              <span>Thất bại</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between text-xs">
              <button
                onClick={() => setLogPage((p) => Math.max(p - 1, 1))}
                disabled={logPage <= 1 || isLoadingLogs}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center space-x-1 shadow-xs cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trang trước</span>
              </button>

              <span className="text-gray-600 font-medium">
                Trang {logPage} / {logTotalPages} (Tổng {logTotal} bản ghi)
              </span>

              <button
                onClick={() => setLogPage((p) => Math.min(p + 1, logTotalPages))}
                disabled={logPage >= logTotalPages || isLoadingLogs}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center space-x-1 shadow-xs cursor-pointer"
              >
                <span>Trang sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
