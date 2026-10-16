using System.Security.Claims;
using EduPasskey.API.Caching;
using EduPasskey.API.Common;
using EduPasskey.API.Data;
using EduPasskey.API.Entities;
using EduPasskey.API.Messaging;
using EduPasskey.API.Services.Interfaces;
using EduPasskey.API.Shared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace EduPasskey.API.Features.Credentials.Commands.RevokeCredential;

public class RevokeCredentialCommandHandler(
    AppDbContext context,
    ISecurityLogService securityLogService,
    IMemoryCache cache,
    IHttpContextAccessor httpContextAccessor) : ICommandHandler<RevokeCredentialCommand>
{
    public async Task<Result> Handle(RevokeCredentialCommand request, CancellationToken cancellationToken)
    {
        var httpContext = httpContextAccessor.HttpContext;
        var userIdStr = httpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
        {
            return Result.Failure(new UnauthorizedError("Bạn cần đăng nhập.", "UNAUTHORIZED"));
        }

        // 1. Kiểm tra StepUp Token
        if (string.IsNullOrWhiteSpace(request.StepUpToken))
        {
            return Result.Failure(new UnauthorizedError("Yêu cầu xác thực bổ sung (Step-up) trước khi thu hồi thiết bị.", "STEPUP_REQUIRED"));
        }

        var tokenCacheKey = $"stepup_token_{request.StepUpToken.Trim()}";
        if (!cache.TryGetValue(tokenCacheKey, out StepUpTokenState? tokenState) || tokenState is null)
        {
            return Result.Failure(new UnauthorizedError("Mã xác thực bước bổ sung đã hết hạn hoặc không tồn tại.", "STEPUP_REQUIRED"));
        }

        // Token dùng 1 lần -> xóa ngay
        cache.Remove(tokenCacheKey);

        if (tokenState.UserId != currentUserId)
        {
            return Result.Failure(new ForbiddenError("Mã xác thực không thuộc về tài khoản này.", "FORBIDDEN"));
        }

        var expectedHash = StepUpHelper.ComputeCanonicalRevokeCredentialHash(request.Id.ToString());
        if (!tokenState.ActionHash.Equals(expectedHash, StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure(new ForbiddenError("Mã xác thực bổ sung không khớp với thiết bị cần thu hồi.", "STEPUP_MISMATCH"));
        }

        // 2. Tìm Credential
        var credential = await context.StoredCredentials
            .FirstOrDefaultAsync(c => c.Id == request.Id && c.UserId == currentUserId && c.RevokedAt == null, cancellationToken);

        if (credential is null)
        {
            return Result.Failure(new NotFoundError("StoredCredential", request.Id));
        }

        // 3. Kiểm tra thiết bị cuối cùng (LAST_CREDENTIAL)
        var activeCount = await context.StoredCredentials
            .CountAsync(c => c.UserId == currentUserId && c.RevokedAt == null, cancellationToken);

        if (activeCount <= 1)
        {
            return Result.Failure(new ConflictError("Không thể thu hồi thiết bị duy nhất còn lại của bạn.", "LAST_CREDENTIAL"));
        }

        // 4. Soft-delete
        credential.RevokedAt = DateTimeOffset.UtcNow;

        await securityLogService.StageSuccessLogAsync(
            SecurityEventType.CredentialRevoked,
            userId: currentUserId,
            credentialId: credential.CredentialId,
            deviceName: credential.DeviceName,
            studentCodeAttempted: httpContext?.User.FindFirstValue("student_code"));

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
