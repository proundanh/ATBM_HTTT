using EduPasskey.API.Messaging;

namespace EduPasskey.API.Features.Admin.Queries.GetAdminLogs;

public record GetAdminLogsQuery(
    string? StudentCode = null,
    bool? IsSuccess = null,
    DateTimeOffset? From = null,
    DateTimeOffset? To = null,
    int Page = 1,
    int PageSize = 20
) : IQuery<PagedAdminLogsResponse>;

public record AdminSecurityLogItemDto(
    long Id,
    string? StudentCode,
    string? StudentCodeAttempted,
    string EventType,
    bool IsSuccess,
    string? FailureReason,
    string? DeviceName,
    string? IpAddress,
    string? UserAgent,
    long? SignCountUsed,
    DateTimeOffset Timestamp
);

public record PagedAdminLogsResponse(
    List<AdminSecurityLogItemDto> Items,
    int Page,
    int PageSize,
    int Total
);
