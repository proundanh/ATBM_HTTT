using System.Security.Claims;
using EduPasskey.API.Caching;
using EduPasskey.API.Common;
using EduPasskey.API.Data;
using EduPasskey.API.Entities;
using EduPasskey.API.Features.Profile.Queries.GetProfile;
using EduPasskey.API.Messaging;
using EduPasskey.API.Services.Interfaces;
using EduPasskey.API.Shared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace EduPasskey.API.Features.Profile.Commands.UpdateProfile;

public class UpdateProfileCommandHandler(
    AppDbContext context,
    ISecurityLogService securityLogService,
    IMemoryCache cache,
    IHttpContextAccessor httpContextAccessor) : ICommandHandler<UpdateProfileCommand, ProfileResponseDto>
{
    public async Task<Result<ProfileResponseDto>> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var httpContext = httpContextAccessor.HttpContext;
        var userIdStr = httpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
        {
            return Result.Failure<ProfileResponseDto>(new UnauthorizedError("Bạn cần đăng nhập.", "UNAUTHORIZED"));
        }

        // 1. Kiểm tra Step-up Token
        if (string.IsNullOrWhiteSpace(request.StepUpToken))
        {
            return Result.Failure<ProfileResponseDto>(
                new UnauthorizedError("Cần xác thực bước bổ sung (Step-up) để cập nhật thông tin nhạy cảm.", "STEPUP_REQUIRED"));
        }

        var tokenCacheKey = $"stepup_token_{request.StepUpToken.Trim()}";
        if (!cache.TryGetValue(tokenCacheKey, out StepUpTokenState? tokenState) || tokenState is null)
        {
            return Result.Failure<ProfileResponseDto>(
                new UnauthorizedError("Mã xác thực bước bổ sung đã hết hạn hoặc không tồn tại.", "STEPUP_REQUIRED"));
        }

        cache.Remove(tokenCacheKey);

        if (tokenState.UserId != currentUserId)
        {
            return Result.Failure<ProfileResponseDto>(
                new ForbiddenError("Mã xác thực không thuộc về tài khoản này.", "FORBIDDEN"));
        }

        var expectedHash = StepUpHelper.ComputeCanonicalUpdateProfileHash(
            request.Email,
            request.Phone ?? "",
            request.ScholarshipAccount ?? "");

        if (!tokenState.ActionHash.Equals(expectedHash, StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure<ProfileResponseDto>(
                new ForbiddenError("Nội dung thay đổi hồ sơ không khớp với thông tin đã xác thực bổ sung.", "STEPUP_MISMATCH"));
        }

        // 2. Tìm User và Profile
        var user = await context.Users
            .Include(u => u.StudentProfile)
            .FirstOrDefaultAsync(u => u.Id == currentUserId, cancellationToken);

        if (user is null)
        {
            return Result.Failure<ProfileResponseDto>(new NotFoundError("User", currentUserId));
        }

        var newEmail = request.Email.Trim().ToLowerInvariant();
        if (newEmail != user.Email.ToLowerInvariant())
        {
            var emailTaken = await context.Users.AnyAsync(u => u.Email == newEmail && u.Id != currentUserId, cancellationToken);
            if (emailTaken)
            {
                return Result.Failure<ProfileResponseDto>(new ConflictError("Email này đã được sử dụng bởi tài khoản khác.", "EMAIL_TAKEN"));
            }
            user.Email = newEmail;
        }

        if (user.StudentProfile is null)
        {
            user.StudentProfile = new StudentProfile { UserId = currentUserId };
            await context.StudentProfiles.AddAsync(user.StudentProfile, cancellationToken);
        }

        user.StudentProfile.Phone = request.Phone?.Trim();
        user.StudentProfile.ScholarshipAccount = request.ScholarshipAccount?.Trim();
        user.StudentProfile.UpdatedAt = DateTimeOffset.UtcNow;

        // Ghi log bảo mật: không ghi số tài khoản nhạy cảm vào log
        await securityLogService.StageSuccessLogAsync(
            SecurityEventType.ProfileUpdated,
            userId: currentUserId,
            studentCodeAttempted: user.StudentCode);

        await context.SaveChangesAsync(cancellationToken);

        var maskedAccount = GetProfileQueryHandler.MaskAccount(user.StudentProfile.ScholarshipAccount);

        var dto = new ProfileResponseDto(
            user.StudentCode,
            user.FullName,
            user.Email,
            user.StudentProfile.Class,
            user.StudentProfile.Major,
            user.StudentProfile.Phone,
            maskedAccount,
            user.StudentProfile.UpdatedAt
        );

        return Result.Success(dto);
    }
}
