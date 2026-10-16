using System.Security.Claims;
using EduPasskey.API.Data;
using EduPasskey.API.Entities;
using EduPasskey.API.Features.Credentials.Queries.GetCredentials;
using EduPasskey.API.Messaging;
using EduPasskey.API.Services.Interfaces;
using EduPasskey.API.Shared;
using Microsoft.EntityFrameworkCore;

namespace EduPasskey.API.Features.Credentials.Commands.RenameCredential;

public class RenameCredentialCommandHandler(
    AppDbContext context,
    ISecurityLogService securityLogService,
    IHttpContextAccessor httpContextAccessor) : ICommandHandler<RenameCredentialCommand, CredentialItemDto>
{
    public async Task<Result<CredentialItemDto>> Handle(RenameCredentialCommand request, CancellationToken cancellationToken)
    {
        var httpContext = httpContextAccessor.HttpContext;
        var userIdStr = httpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
        {
            return Result.Failure<CredentialItemDto>(new UnauthorizedError("Bạn cần đăng nhập.", "UNAUTHORIZED"));
        }

        if (string.IsNullOrWhiteSpace(request.DeviceName))
        {
            return Result.Failure<CredentialItemDto>(new BadError("Tên thiết bị không được để trống.", "VALIDATION_ERROR"));
        }

        var credential = await context.StoredCredentials
            .FirstOrDefaultAsync(c => c.Id == request.Id && c.UserId == currentUserId && c.RevokedAt == null, cancellationToken);

        if (credential is null)
        {
            return Result.Failure<CredentialItemDto>(new NotFoundError("StoredCredential", request.Id));
        }

        credential.DeviceName = request.DeviceName.Trim();

        await securityLogService.StageSuccessLogAsync(
            SecurityEventType.CredentialRenamed,
            userId: currentUserId,
            credentialId: credential.CredentialId,
            deviceName: credential.DeviceName,
            studentCodeAttempted: httpContext?.User.FindFirstValue("student_code"));

        await context.SaveChangesAsync(cancellationToken);

        var currentClaimCredId = httpContext?.User.FindFirstValue("amr_cred_id");
        byte[]? currentCredIdBytes = null;
        if (!string.IsNullOrEmpty(currentClaimCredId))
        {
            try { currentCredIdBytes = Convert.FromBase64String(currentClaimCredId); } catch { }
        }

        var isCurrent = currentCredIdBytes != null && credential.CredentialId.SequenceEqual(currentCredIdBytes);
        var transports = !string.IsNullOrWhiteSpace(credential.Transports)
            ? credential.Transports.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            : Array.Empty<string>();

        return Result.Success(new CredentialItemDto(
            credential.Id,
            credential.DeviceName,
            credential.CreatedAt,
            credential.LastUsedAt,
            credential.BackupEligible,
            credential.BackupState,
            transports,
            credential.AaGuid,
            isCurrent
        ));
    }
}
