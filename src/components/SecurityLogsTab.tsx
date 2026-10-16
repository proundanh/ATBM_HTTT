import { useState, useEffect } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Laptop,
  AlertTriangle,
  Clock,
  Globe,
  Key,
} from 'lucide-react';
import type { SecurityLogItem, User } from '../lib/types';
import { getSecurityLogs } from '../lib/api';

interface SecurityLogsTabProps {
  user: User;
}

const EVENT_TYPE_MAP: Record<string, { label: string; color: string; desc: string }> = {
  RegisterSuccess: {
    label: 'Đăng ký Passkey thành công',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    desc: 'Thiết bị mới đã liên kết khóa công khai vào hệ thống',
  },
  RegisterFailed: {
    label: 'Đăng ký Passkey thất bại',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    desc: 'Lỗi trong quá trình tạo cặp khóa hoặc xác minh Attestation',
  },
  LoginSuccess: {
    label: 'Đăng nhập Passkey thành công',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    desc: 'Xác minh chữ ký số phần cứng và cấp phiên làm việc',
  },
  LoginFailed: {
    label: 'Đăng nhập thất bại',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    desc: 'Chữ ký không khớp, sai khóa hoặc hủy quét sinh trắc',
  },
  Logout: {
    label: 'Đăng xuất khỏi hệ thống',
    color: 'text-gray-700 bg-gray-50 border-gray-200',
    desc: 'Hủy cookie phiên làm việc StudentPortal.Auth',
  },
  StepUpSuccess: {
    label: 'Xác thực Step-Up thành công',
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    desc: 'Quét lại sinh trắc để cấp StepUpToken dùng 1 lần',
  },
  StepUpFailed: {
    label: 'Xác thực Step-Up thất bại',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    desc: 'Hủy quét vân tay khi thực hiện thao tác nhạy cảm',
  },
  CredentialAdded: {
    label: 'Liên kết thêm thiết bị mới',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    desc: 'Đăng ký thêm một Passkey cho máy tính/điện thoại phụ',
  },
  CredentialRenamed: {
    label: 'Đổi tên thiết bị Passkey',
    color: 'text-gray-700 bg-gray-50 border-gray-200',
    desc: 'Đã cập nhật tên nhận diện thiết bị',
  },
  CredentialRevoked: {
    label: 'Thu hồi khóa thiết bị',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    desc: 'Hủy quyền truy cập của một thiết bị cũ/mất máy',
  },
  ProfileUpdated: {
    label: 'Cập nhật hồ sơ sinh viên',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    desc: 'Thay đổi STK học bổng hoặc thông tin liên lạc (sau Step-Up)',
  },
};

export const SecurityLogsTab = ({ user }: SecurityLogsTabProps) => {
  const [logs, setLogs] = useState<SecurityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [total, setTotal] = useState(0);

  // Filters
  const [filterSuccess, setFilterSuccess] = useState<string>('all'); // 'all' | 'true' | 'false'
  const [filterEventType, setFilterEventType] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, [page, filterSuccess, filterEventType]);

  const fetchLogs = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const isSuccessParam =
      filterSuccess === 'all' ? undefined : filterSuccess === 'true';

    const eventTypeParam =
      filterEventType === 'all' ? undefined : parseInt(filterEventType, 10);

    try {
      const res = await getSecurityLogs({
        page,
        pageSize,
        isSuccess: isSuccessParam,
        eventType: isEventTypeValid(eventTypeParam) ? eventTypeParam : undefined,
      });

      if (res.isSuccess && res.value) {
        setLogs(res.value.items);
        setTotal(res.value.total);
      } else {
        setErrorMsg(res.error?.message || 'Không thể tải nhật ký an toàn.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi tải nhật ký kiểm toán bảo mật.');
    } finally {
      setIsLoading(false);
    }
  };

  const isEventTypeValid = (val: any): val is number => {
    return typeof val === 'number' && !isNaN(val);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Nhật Ký Kiểm Toán Bảo Mật (Security Logs)
              </h1>
              <p className="text-xs text-gray-500">
                Lịch sử xác thực, đăng nhập và thao tác bảo vệ sinh viên{' '}
                <strong className="text-gray-900 font-mono">{user.studentCode}</strong>
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Làm mới ({total} bản ghi)</span>
        </button>
      </div>

      {/* Security explanation banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 text-xs text-blue-900 space-y-1.5 leading-relaxed">
          <div className="font-semibold flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span>Chống Nhân Bản Khóa (Sign Count Auditing)</span>
          </div>
          <p className="text-[11px] text-blue-800">
            Mỗi khi Authenticator ký số, bộ đếm phần cứng <code>SignCount</code> tự động tăng 1 đơn vị. Nếu Server phát hiện <code>SignCount</code> gửi lên nhỏ hơn hoặc bằng lần trước, hệ thống lập tức khóa tài khoản vì nghi ngờ khóa bảo mật đã bị kẻ xấu nhân bản vật lý (Cloned Authenticator).
          </p>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700 space-y-1.5 leading-relaxed">
          <div className="font-semibold text-gray-900 flex items-center space-x-1.5">
            <Globe className="w-4 h-4 text-gray-600" />
            <span>Giám Sát Địa Chỉ IP & Trình Duyệt</span>
          </div>
          <p className="text-[11px] text-gray-600">
            Hệ thống tự động lưu vết IP truy cập và chuỗi User-Agent của mọi yêu cầu xác thực. Mọi nỗ lực truy cập bất thường hoặc thử thách thất bại đều được lưu lại để phục vụ đối soát, điều tra gian lận học đường.
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-gray-600 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Bộ lọc:</span>
          </div>

          <select
            value={filterSuccess}
            onChange={(e) => {
              setFilterSuccess(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-blue-600"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="true">Chỉ thành công (Success)</option>
            <option value="false">Chỉ thất bại (Failed)</option>
          </select>

          <select
            value={filterEventType}
            onChange={(e) => {
              setFilterEventType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-blue-600"
          >
            <option value="all">Tất cả loại sự kiện</option>
            <option value="3">Đăng nhập thành công (LoginSuccess)</option>
            <option value="4">Đăng nhập thất bại (LoginFailed)</option>
            <option value="1">Đăng ký Passkey (RegisterSuccess)</option>
            <option value="6">Xác thực Step-Up (StepUpSuccess)</option>
            <option value="8">Thêm thiết bị mới (CredentialAdded)</option>
            <option value="10">Thu hồi thiết bị (CredentialRevoked)</option>
            <option value="11">Cập nhật hồ sơ (ProfileUpdated)</option>
            <option value="5">Đăng xuất (Logout)</option>
          </select>
        </div>

        <div className="text-gray-500 text-[11px]">
          Hiển thị trang <strong>{page}</strong> / <strong>{totalPages}</strong> (Tổng {total} bản ghi)
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={fetchLogs}
            className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Table view */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[11px]">
                <th className="py-3 px-4">Thời Gian</th>
                <th className="py-3 px-4">Loại Sự Kiện</th>
                <th className="py-3 px-4">Thiết Bị / IP</th>
                <th className="py-3 px-4">Sign Count</th>
                <th className="py-3 px-4 text-right">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang truy vấn nhật ký kiểm toán...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    Không có nhật ký nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                logs.map((item) => {
                  const eventConfig =
                    EVENT_TYPE_MAP[item.eventType] || {
                      label: item.eventType,
                      color: 'text-gray-700 bg-gray-50 border-gray-200',
                      desc: '',
                    };

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Time */}
                      <td className="py-3 px-4 whitespace-nowrap text-gray-600 font-mono text-[11px]">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{new Date(item.timestamp).toLocaleString('vi-VN')}</span>
                        </div>
                      </td>

                      {/* Event Type */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-semibold text-[11px] border ${eventConfig.color}`}
                          >
                            {eventConfig.label}
                          </span>
                          {item.failureReason && (
                            <div className="text-[10px] text-rose-600 font-mono mt-0.5">
                              Lý do: {item.failureReason}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Device & IP */}
                      <td className="py-3 px-4 text-gray-700">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5 font-medium text-gray-900">
                            <Laptop className="w-3.5 h-3.5 text-gray-400" />
                            <span>{item.deviceName || 'Web Browser (Local)'}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            IP: {item.ipAddress || '127.0.0.1'}
                          </div>
                        </div>
                      </td>

                      {/* Sign count */}
                      <td className="py-3 px-4 font-mono text-gray-600">
                        {item.signCountUsed !== undefined && item.signCountUsed !== null ? (
                          <div className="flex items-center space-x-1">
                            <Key className="w-3 h-3 text-blue-600" />
                            <span>#{item.signCountUsed}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-right">
                        {item.isSuccess ? (
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1 || isLoading}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 shadow-xs cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Trang trước</span>
          </button>

          <span className="text-xs text-gray-600 font-medium">
            Trang {page} / {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page >= totalPages || isLoading}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 shadow-xs cursor-pointer"
          >
            <span>Trang sau</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
