using System.Security.Claims;
using EduPasskey.API.Data;
using EduPasskey.API.Entities;
using EduPasskey.API.Messaging;
using EduPasskey.API.Shared;
using Microsoft.EntityFrameworkCore;

namespace EduPasskey.API.Features.Admin.Queries.GetAdminLogs;

public class GetAdminLogsQueryHandler(
    AppDbContext context,
    IHttpContextAccessor httpContextAccessor) : IQueryHandler<GetAdminLogsQuery, PagedAdminLogsResponse>
{
    public async Task<Result<PagedAdminLogsResponse>> Handle(GetAdminLogsQuery request, CancellationToken cancellationToken)
    {
        var httpContext = httpContextAccessor.HttpContext;
        var role = httpContext?.User.FindFirstValue(ClaimTypes.Role);
        if (role != UserRole.Admin.ToString())
        {
            return Result.Failure<PagedAdminLogsResponse>(new ForbiddenError("Chỉ quản trị viên mới có quyền truy cập.", "FORBIDDEN"));
        }

        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize is < 1 or > 100 ? 20 : request.PageSize;

        var query = context.SecurityLogs
            .Include(l => l.User)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.StudentCode))
        {
            var code = request.StudentCode.Trim().ToLower();
            query = query.Where(l =>
                (l.User != null && l.User.StudentCode.ToLower() == code) ||
                (l.StudentCodeAttempted != null && l.StudentCodeAttempted.ToLower() == code));
        }

        if (request.IsSuccess.HasValue)
        {
            query = query.Where(l => l.IsSuccess == request.IsSuccess.Value);
        }

        if (request.From.HasValue)
        {
            query = query.Where(l => l.Timestamp >= request.From.Value);
        }

        if (request.To.HasValue)
        {
            query = query.Where(l => l.Timestamp <= request.To.Value);
        }

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(l => l.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new AdminSecurityLogItemDto(
                l.Id,
                l.User != null ? l.User.StudentCode : null,
                l.StudentCodeAttempted,
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

        return Result.Success(new PagedAdminLogsResponse(items, page, pageSize, total));
    }
}
