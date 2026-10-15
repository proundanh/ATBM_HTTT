using EduPasskey.API.Entities;

namespace EduPasskey.API.Services.Interfaces;

public interface ISecurityLogService
{
    /// <summary>
    /// Thêm log thành công vào ChangeTracker để lưu cùng Transaction với nghiệp vụ chính
    /// </summary>
    Task StageSuccessLogAsync(
        SecurityEventType eventType,
        Guid? userId,
        byte[]? credentialId = null,
        string? deviceName = null,
        long? signCountUsed = null,
        string? studentCodeAttempted = null);

    /// <summary>
    /// Ghi và lưu ngay lập tức log thành công vào cơ sở dữ liệu (ví dụ Logout)
    /// </summary>
    Task WriteSuccessLogAsync(
        SecurityEventType eventType,
        Guid? userId,
        byte[]? credentialId = null,
        string? deviceName = null,
        long? signCountUsed = null,
        string? studentCodeAttempted = null);

    /// <summary>
    /// Ghi và lưu ngay lập tức log thất bại vào cơ sở dữ liệu
    /// </summary>
    Task WriteFailureLogAsync(
        SecurityEventType eventType,
        string failureReason,
        Guid? userId = null,
        byte[]? credentialId = null,
        string? deviceName = null,
        long? signCountUsed = null,
        string? studentCodeAttempted = null);
}
