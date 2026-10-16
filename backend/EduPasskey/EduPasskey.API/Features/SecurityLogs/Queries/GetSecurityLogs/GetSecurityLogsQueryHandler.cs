using System.Security.Claims;
using EduPasskey.API.Data;
using EduPasskey.API.Messaging;
using EduPasskey.API.Shared;
using Microsoft.EntityFrameworkCore;

namespace EduPasskey.API.Features.SecurityLogs.Queries.GetSecurityLogs;

public class GetSecurityLogsQueryHandler(
    AppDbContext context,
    IHttpContextAccessor httpContextAccessor) : IQueryHandler<GetSecurityLogsQuery, PagedSecurityLogsResponse>
{
    public async Task<Result<PagedSecurityLogsResponse>> Handle(GetSecurityLogsQuery request, CancellationToken cancellationToken)
    {
        var httpContext = httpContextAccessor.HttpContext;
        var userIdStr = httpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
        {
            return Result.Failure<PagedSecurityLogsResponse>(new UnauthorizedError("Bạn cần đăng nhập.", "UNAUTHORIZED"));
        }

        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize is < 1 or > 100 ? 20 : request.PageSize;

        var query = context.SecurityLogs
            .AsNoTracking()
            .Where(l => l.UserId == currentUserId);

        if (request.IsSuccess.HasValue)
        {
            query = query.Where(l => l.IsSuccess == request.IsSuccess.Value);
        }

        if (request.EventType.HasValue)
        {
            query = query.Where(l => l.EventType == request.EventType.Value);
        }

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(l => l.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new SecurityLogItemDto(
                l.Id,
                l.EventType.ToString(),
                l.IsSuccess,
                l.FailureReason,
                l.DeviceName,
                l.IpAddress,
                l.UserAgent,
                l.SignCountUsed,
                l.Timestamp
            ))
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedSecurityLogsResponse(items, page, pageSize, total));
    }
}
