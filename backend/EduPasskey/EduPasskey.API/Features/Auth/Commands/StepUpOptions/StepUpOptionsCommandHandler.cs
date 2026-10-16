using System.Security.Claims;
using EduPasskey.API.Caching;
using EduPasskey.API.Common;
using EduPasskey.API.Data;
using EduPasskey.API.Messaging;
using EduPasskey.API.Shared;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace EduPasskey.API.Features.Auth.Commands.StepUpOptions;

public class StepUpOptionsCommandHandler(
    AppDbContext context,
    IFido2 fido2,
    IMemoryCache cache,
    IHttpContextAccessor httpContextAccessor) : ICommandHandler<StepUpOptionsCommand, StepUpOptionsResponse>
{
    public async Task<Result<StepUpOptionsResponse>> Handle(StepUpOptionsCommand request, CancellationToken cancellationToken)
    {
        var httpContext = httpContextAccessor.HttpContext;
        var userIdStr = httpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
        {
            return Result.Failure<StepUpOptionsResponse>(new UnauthorizedError("Bạn cần đăng nhập để thực hiện thao tác này.", "UNAUTHORIZED"));
        }

        // 1. Tính toán actionHash chuẩn hóa từ Action và Payload
        var actionHash = StepUpHelper.ComputeCanonicalActionHash(request.Action, request.Payload);

        // 2. Lấy danh sách passkey hợp lệ của chính user này
        var credentials = await context.StoredCredentials
            .AsNoTracking()
            .Where(c => c.UserId == userId && c.RevokedAt == null)
            .ToListAsync(cancellationToken);

        if (credentials.Count == 0)
        {
            return Result.Failure<StepUpOptionsResponse>(new NotFoundError("StoredCredential", userId));
        }

        var allowedCredentials = credentials.Select(c => new PublicKeyCredentialDescriptor(c.CredentialId)).ToList();

        // 3. Tạo assertion options với Fido2NetLib
        var options = fido2.GetAssertionOptions(new GetAssertionOptionsParams
        {
            AllowedCredentials = allowedCredentials,
            UserVerification = UserVerificationRequirement.Required
        });

        // 4. Lưu Cache cùng UserId và actionHash
        var ceremonyId = Guid.NewGuid().ToString("N");
        var cacheKey = $"stepup_{ceremonyId}";
        var cacheState = new StepUpCacheState(options, userId, actionHash);

        cache.Set(cacheKey, cacheState, TimeSpan.FromSeconds(120));

        return Result.Success(new StepUpOptionsResponse(ceremonyId, options));
    }
}
