using EduPasskey.API.Entities;
using EduPasskey.API.Messaging;

namespace EduPasskey.API.Features.SecurityLogs.Queries.GetSecurityLogs;

public record GetSecurityLogsQuery(
    int Page = 1,
    int PageSize = 20,
    bool? IsSuccess = null,
    SecurityEventType? EventType = null
) : IQuery<PagedSecurityLogsResponse>;

public record SecurityLogItemDto(
    long Id,
    string EventType,
    bool IsSuccess,
    string? FailureReason,
    string? DeviceName,
    string? IpAddress,
    string? UserAgent,
    long? SignCountUsed,
    DateTimeOffset Timestamp
);

public record PagedSecurityLogsResponse(
    List<SecurityLogItemDto> Items,
    int Page,
    int PageSize,
    int Total
);
