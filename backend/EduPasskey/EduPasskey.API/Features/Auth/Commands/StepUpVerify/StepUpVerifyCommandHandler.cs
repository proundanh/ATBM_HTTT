using System.Security.Claims;
using EduPasskey.API.Caching;
using EduPasskey.API.Data;
using EduPasskey.API.Entities;
using EduPasskey.API.Messaging;
using EduPasskey.API.Services.Interfaces;
using EduPasskey.API.Shared;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace EduPasskey.API.Features.Auth.Commands.StepUpVerify;

public class StepUpVerifyCommandHandler(
    ILogger<StepUpVerifyCommandHandler> logger,
    AppDbContext context,
    ISecurityLogService securityLogService,
    IFido2 fido2,
    IMemoryCache cache,
    IHttpContextAccessor httpContextAccessor) : ICommandHandler<StepUpVerifyCommand, StepUpVerifyResponse>
{
    public async Task<Result<StepUpVerifyResponse>> Handle(StepUpVerifyCommand request, CancellationToken cancellationToken)
    {
        var httpContext = httpContextAccessor.HttpContext;
        var userIdStr = httpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
        {
            return Result.Failure<StepUpVerifyResponse>(new UnauthorizedError("Bạn cần đăng nhập để thực hiện thao tác này.", "UNAUTHORIZED"));
        }

        var cacheKey = $"stepup_{request.CeremonyId}";
        if (!cache.TryGetValue(cacheKey, out StepUpCacheState? state) || state is null)
        {
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.StepUpFailed,
                failureReason: "Step-up ceremony expired or invalid",
                userId: currentUserId);

            return Result.Failure<StepUpVerifyResponse>(
                new BadError("Phiên xác thực bổ sung đã hết hạn hoặc không hợp lệ.", "CHALLENGE_EXPIRED"));
        }

        cache.Remove(cacheKey);

        if (state.UserId != currentUserId)
        {
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.StepUpFailed,
                failureReason: "Step-up ceremony user mismatch",
                userId: currentUserId);

            return Result.Failure<StepUpVerifyResponse>(
                new ForbiddenError("Phiên xác thực không thuộc về tài khoản này.", "FORBIDDEN"));
        }

        // Tìm Credential của đúng user
        var storedCred = await context.StoredCredentials
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.CredentialId == request.Credential.RawId && c.UserId == currentUserId, cancellationToken);

        if (storedCred is null)
        {
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.StepUpFailed,
                failureReason: "Credential not found or does not belong to user",
                userId: currentUserId);

            return Result.Failure<StepUpVerifyResponse>(
                new UnauthorizedError("Thiết bị xác thực không hợp lệ hoặc không thuộc tài khoản của bạn.", "ASSERTION_INVALID"));
        }

        if (storedCred.RevokedAt != null)
        {
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.StepUpFailed,
                failureReason: "Credential is revoked",
                userId: currentUserId);

            return Result.Failure<StepUpVerifyResponse>(
                new UnauthorizedError("Thiết bị này đã bị thu hồi.", "CREDENTIAL_REVOKED"));
        }

        var user = storedCred.User;
        VerifyAssertionResult assertionResult;
        try
        {
            assertionResult = await fido2.MakeAssertionAsync(new MakeAssertionParams
            {
                AssertionResponse = request.Credential,
                OriginalOptions = state.Options,
                StoredPublicKey = storedCred.PublicKey,
                StoredSignatureCounter = (uint)storedCred.SignatureCounter,
                IsUserHandleOwnerOfCredentialIdCallback = (args, ct) =>
                {
                    if (args.UserHandle == null || args.UserHandle.Length == 0)
                        return Task.FromResult(true);

                    return Task.FromResult(user.WebAuthnUserId.SequenceEqual(args.UserHandle));
                }
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Step-up assertion failed for User {UserId}", currentUserId);
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.StepUpFailed,
                failureReason: ex.Message,
                userId: currentUserId);

            return Result.Failure<StepUpVerifyResponse>(
                new UnauthorizedError("Xác thực bước bổ sung thất bại.", "ASSERTION_INVALID"));
        }

        // Check Counter rollback
        if (storedCred.SignatureCounter > 0 && assertionResult.SignCount <= storedCred.SignatureCounter)
        {
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.StepUpFailed,
                failureReason: "Signature counter rollback",
                userId: currentUserId);

            return Result.Failure<StepUpVerifyResponse>(
                new UnauthorizedError("Phát hiện bất thường về bảo mật từ thiết bị.", "COUNTER_ROLLBACK"));
        }

        storedCred.SignatureCounter = assertionResult.SignCount;
        storedCred.LastUsedAt = DateTimeOffset.UtcNow;

        await securityLogService.StageSuccessLogAsync(
            SecurityEventType.StepUpSuccess,
            userId: currentUserId,
            credentialId: storedCred.CredentialId,
            deviceName: storedCred.DeviceName,
            signCountUsed: assertionResult.SignCount,
            studentCodeAttempted: user.StudentCode);

        await context.SaveChangesAsync(cancellationToken);

        // Sinh StepUpToken có thời hạn 120s
        var stepUpToken = Guid.NewGuid().ToString("N");
        var tokenState = new StepUpTokenState(currentUserId, state.ActionHash);
        cache.Set($"stepup_token_{stepUpToken}", tokenState, TimeSpan.FromSeconds(120));

        return Result.Success(new StepUpVerifyResponse(stepUpToken, 120));
    }
}
