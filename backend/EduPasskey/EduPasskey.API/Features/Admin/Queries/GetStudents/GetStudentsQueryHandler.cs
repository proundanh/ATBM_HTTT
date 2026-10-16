using System.Security.Claims;
using EduPasskey.API.Data;
using EduPasskey.API.Entities;
using EduPasskey.API.Messaging;
using EduPasskey.API.Shared;
using Microsoft.EntityFrameworkCore;

namespace EduPasskey.API.Features.Admin.Queries.GetStudents;

public class GetStudentsQueryHandler(
    AppDbContext context,
    IHttpContextAccessor httpContextAccessor) : IQueryHandler<GetStudentsQuery, PagedStudentsResponse>
{
    public async Task<Result<PagedStudentsResponse>> Handle(GetStudentsQuery request, CancellationToken cancellationToken)
    {
        var httpContext = httpContextAccessor.HttpContext;
        var role = httpContext?.User.FindFirstValue(ClaimTypes.Role);
        if (role != UserRole.Admin.ToString())
        {
            return Result.Failure<PagedStudentsResponse>(new ForbiddenError("Chỉ quản trị viên mới có quyền truy cập.", "FORBIDDEN"));
        }

        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize is < 1 or > 100 ? 20 : request.PageSize;

        var query = context.Users
            .Include(u => u.StudentProfile)
            .Include(u => u.StoredCredentials)
            .AsNoTracking()
            .Where(u => u.Role == UserRole.Student);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(u =>
                u.StudentCode.ToLower().Contains(search) ||
                u.FullName.ToLower().Contains(search) ||
                u.Email.ToLower().Contains(search));
        }

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new StudentItemDto(
                u.Id,
                u.StudentCode,
                u.FullName,
                u.Email,
                u.StudentProfile != null ? u.StudentProfile.Class : null,
                u.StudentProfile != null ? u.StudentProfile.Major : null,
                u.IsActive,
                u.StoredCredentials.Count(c => c.RevokedAt == null),
                u.StoredCredentials.Where(c => c.RevokedAt == null).Max(c => c.LastUsedAt)
            ))
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedStudentsResponse(items, page, pageSize, total));
    }
}
