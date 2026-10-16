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

namespace EduPasskey.API.Features.Credentials.Commands.AddCredentialVerify;

public class AddCredentialVerifyCommandHandler(
    ILogger<AddCredentialVerifyCommandHandler> logger,
    AppDbContext context,
    ISecurityLogService securityLogService,
    IFido2 fido2,
    IMemoryCache cache,
    IHttpContextAccessor httpContextAccessor) : ICommandHandler<AddCredentialVerifyCommand, AddCredentialVerifyResponse>
{
    public async Task<Result<AddCredentialVerifyResponse>> Handle(AddCredentialVerifyCommand request, CancellationToken cancellationToken)
    {
        var httpContext = httpContextAccessor.HttpContext;
        var userIdStr = httpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
        {
            return Result.Failure<AddCredentialVerifyResponse>(new UnauthorizedError("Bạn cần đăng nhập.", "UNAUTHORIZED"));
        }

        var cacheKey = $"add_cred_{request.CeremonyId}";
        if (!cache.TryGetValue(cacheKey, out AddCredentialCacheState? state) || state is null)
        {
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.CredentialAdded,
                failureReason: "Add credential ceremony expired or invalid",
                userId: currentUserId);

            return Result.Failure<AddCredentialVerifyResponse>(
                new BadError("Phiên thêm thiết bị đã hết hạn hoặc không hợp lệ.", "CHALLENGE_EXPIRED"));
        }

        cache.Remove(cacheKey);

        if (state.UserId != currentUserId)
        {
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.CredentialAdded,
                failureReason: "User mismatch in add credential ceremony",
                userId: currentUserId);

            return Result.Failure<AddCredentialVerifyResponse>(
                new ForbiddenError("Phiên xác thực không khớp với tài khoản.", "FORBIDDEN"));
        }

        RegisteredPublicKeyCredential cred;
        try
        {
            cred = await fido2.MakeNewCredentialAsync(new MakeNewCredentialParams
            {
                IsCredentialIdUniqueToUserCallback = async (args, ct) =>
                    !await context.StoredCredentials.AnyAsync(c => c.CredentialId == args.CredentialId, ct),
                OriginalOptions = state.Options,
                AttestationResponse = request.Credential
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "MakeNewCredentialAsync failed for User {UserId}", currentUserId);
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.CredentialAdded,
                failureReason: ex.Message,
                userId: currentUserId);

            return Result.Failure<AddCredentialVerifyResponse>(
                new BadError("Thông tin xác thực của thiết bị không hợp lệ.", "ATTESTATION_INVALID"));
        }

        var deviceName = string.IsNullOrWhiteSpace(request.DeviceName) ? "Thiết bị mới" : request.DeviceName.Trim();

        var credential = new StoredCredential
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            CredentialId = cred.Id,
            PublicKey = cred.PublicKey,
            SignatureCounter = cred.SignCount,
            AaGuid = cred.AaGuid,
            DeviceName = deviceName,
            Transports = cred.Transports != null ? string.Join(",", cred.Transports) : null,
            BackupEligible = cred.IsBackupEligible,
            BackupState = cred.IsBackedUp
        };

        await context.StoredCredentials.AddAsync(credential, cancellationToken);

        await securityLogService.StageSuccessLogAsync(
            SecurityEventType.CredentialAdded,
            userId: currentUserId,
            credentialId: credential.CredentialId,
            deviceName: credential.DeviceName,
            studentCodeAttempted: httpContext?.User.FindFirstValue("student_code"));

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(new AddCredentialVerifyResponse(
            credential.Id,
            credential.DeviceName,
            credential.CreatedAt
        ));
    }
}
