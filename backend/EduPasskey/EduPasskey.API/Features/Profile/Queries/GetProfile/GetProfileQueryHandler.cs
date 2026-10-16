using System.Security.Claims;
using EduPasskey.API.Data;
using EduPasskey.API.Messaging;
using EduPasskey.API.Shared;
using Microsoft.EntityFrameworkCore;

namespace EduPasskey.API.Features.Profile.Queries.GetProfile;

public class GetProfileQueryHandler(
    AppDbContext context,
    IHttpContextAccessor httpContextAccessor) : IQueryHandler<GetProfileQuery, ProfileResponseDto>
{
    public async Task<Result<ProfileResponseDto>> Handle(GetProfileQuery request, CancellationToken cancellationToken)
    {
        var httpContext = httpContextAccessor.HttpContext;
        var userIdStr = httpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
        {
            return Result.Failure<ProfileResponseDto>(new UnauthorizedError("Bạn cần đăng nhập.", "UNAUTHORIZED"));
        }

        var user = await context.Users
            .Include(u => u.StudentProfile)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == currentUserId, cancellationToken);

        if (user is null)
        {
            return Result.Failure<ProfileResponseDto>(new NotFoundError("User", currentUserId));
        }

        var profile = user.StudentProfile;
        var maskedAccount = MaskAccount(profile?.ScholarshipAccount);

        var dto = new ProfileResponseDto(
            user.StudentCode,
            user.FullName,
            user.Email,
            profile?.Class,
            profile?.Major,
            profile?.Phone,
            maskedAccount,
            profile?.UpdatedAt ?? user.CreatedAt
        );

        return Result.Success(dto);
    }

    public static string? MaskAccount(string? account)
    {
        if (string.IsNullOrWhiteSpace(account)) return null;
        var trimmed = account.Trim();
        return trimmed.Length >= 4
            ? $"•••• {trimmed[^4..]}"
            : "••••";
    }
}
