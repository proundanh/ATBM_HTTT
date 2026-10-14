using EduPasskey.API.Data;
using EduPasskey.API.Entities;
using EduPasskey.API.Services.Interfaces;

namespace EduPasskey.API.Services.Implements;

public class SecurityLogService : ISecurityLogService
{
    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public SecurityLogService(AppDbContext db, IHttpContextAccessor httpContextAccessor)
    {
        _db = db;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task StageSuccessLogAsync(
        SecurityEventType eventType,
        Guid? userId,
        byte[]? credentialId = null,
        string? deviceName = null,
        long? signCountUsed = null,
        string? studentCodeAttempted = null)
    {
        var log = CreateBaseLog(eventType, isSuccess: true, userId, credentialId, deviceName, signCountUsed, studentCodeAttempted);
        await _db.SecurityLogs.AddAsync(log);
        // Không gọi SaveChangesAsync() ở đây để handler chính commit chung 1 Transaction với nghiệp vụ
    }

    public async Task WriteFailureLogAsync(
        SecurityEventType eventType,
        string failureReason,
        Guid? userId = null,
        byte[]? credentialId = null,
        string? deviceName = null,
        long? signCountUsed = null,
        string? studentCodeAttempted = null)
    {
        var log = CreateBaseLog(eventType, isSuccess: false, userId, credentialId, deviceName, signCountUsed, studentCodeAttempted);
        log.FailureReason = failureReason;

        await _db.SecurityLogs.AddAsync(log);
        await _db.SaveChangesAsync(); // Bắt buộc lưu ngay lập tức vì luồng thất bại sẽ return lỗi mà không gọi SaveChanges
    }

    private SecurityLog CreateBaseLog(
        SecurityEventType eventType,
        bool isSuccess,
        Guid? userId,
        byte[]? credentialId,
        string? deviceName,
        long? signCountUsed,
        string? studentCodeAttempted)
    {
        var httpContext = _httpContextAccessor.HttpContext;

        // Lấy địa chỉ IP (ưu tiên X-Forwarded-For khi chạy sau Proxy/Docker/Vite)
        var ipAddress = httpContext?.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim();
        if (string.IsNullOrWhiteSpace(ipAddress))
        {
            ipAddress = httpContext?.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
        }

        // Lấy thông tin trình duyệt / hệ điều hành
        var userAgent = httpContext?.Request.Headers.UserAgent.ToString();
        if (userAgent?.Length > 500)
        {
            userAgent = userAgent[..500]; // Cắt ngắn tránh tràn cột DB (varchar(500))
        }

        return new SecurityLog
        {
            UserId = userId,
            StudentCodeAttempted = studentCodeAttempted,
            CredentialId = credentialId,
            DeviceName = deviceName,
            EventType = eventType,
            IsSuccess = isSuccess,
            SignCountUsed = signCountUsed,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            Timestamp = DateTimeOffset.UtcNow
        };
    }
}
