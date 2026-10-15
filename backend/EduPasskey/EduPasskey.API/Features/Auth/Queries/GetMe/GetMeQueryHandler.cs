using System.Security.Claims;
using EduPasskey.API.Data;
using EduPasskey.API.Features.Auth.Commands.RegisterVerify;
using EduPasskey.API.Messaging;
using EduPasskey.API.Shared;
using Microsoft.EntityFrameworkCore;

namespace EduPasskey.API.Features.Auth.Queries.GetMe;

public class GetMeQueryHandler(
    AppDbContext context,
    IHttpContextAccessor httpContextAccessor) : IQueryHandler<GetMeQuery, UserDto>
{
    public async Task<Result<UserDto>> Handle(GetMeQuery request, CancellationToken cancellationToken)
    {
        var httpContext = httpContextAccessor.HttpContext;
        if (httpContext?.User.Identity?.IsAuthenticated != true)
        {
            return Result.Failure<UserDto>(new UnauthorizedError("Chưa đăng nhập.", "UNAUTHORIZED"));
        }

        var userIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
        {
            return Result.Failure<UserDto>(new UnauthorizedError("Phiên đăng nhập không hợp lệ.", "UNAUTHORIZED"));
        }

        var user = await context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user is null)
        {
            return Result.Failure<UserDto>(new NotFoundError("User", userId));
        }

        if (!user.IsActive)
        {
            return Result.Failure<UserDto>(new ForbiddenError("Tài khoản đã bị tạm khóa.", "USER_INACTIVE"));
        }

        return Result.Success(new UserDto(user.Id, user.StudentCode, user.FullName, user.Role.ToString()));
    }
}
