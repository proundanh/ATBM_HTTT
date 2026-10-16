using System.Security.Claims;
using EduPasskey.API.Data;
using EduPasskey.API.Messaging;
using EduPasskey.API.Shared;
using Microsoft.EntityFrameworkCore;

namespace EduPasskey.API.Features.Credentials.Queries.GetCredentials;

public class GetCredentialsQueryHandler(
    AppDbContext context,
    IHttpContextAccessor httpContextAccessor) : IQueryHandler<GetCredentialsQuery, List<CredentialItemDto>>
{
    public async Task<Result<List<CredentialItemDto>>> Handle(GetCredentialsQuery request, CancellationToken cancellationToken)
    {
        var httpContext = httpContextAccessor.HttpContext;
        var userIdStr = httpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
        {
            return Result.Failure<List<CredentialItemDto>>(new UnauthorizedError("Bạn cần đăng nhập.", "UNAUTHORIZED"));
        }

        var currentClaimCredId = httpContext?.User.FindFirstValue("amr_cred_id");
        byte[]? currentCredIdBytes = null;
        if (!string.IsNullOrEmpty(currentClaimCredId))
        {
            try
            {
                currentCredIdBytes = Convert.FromBase64String(currentClaimCredId);
            }
            catch
            {
                // Ignore parse failure
            }
        }

        var credentials = await context.StoredCredentials
            .AsNoTracking()
            .Where(c => c.UserId == currentUserId && c.RevokedAt == null)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(cancellationToken);

        var result = credentials.Select(c =>
        {
            var isCurrent = currentCredIdBytes != null && c.CredentialId.SequenceEqual(currentCredIdBytes);
            var transports = !string.IsNullOrWhiteSpace(c.Transports)
                ? c.Transports.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                : Array.Empty<string>();

            return new CredentialItemDto(
                c.Id,
                c.DeviceName,
                c.CreatedAt,
                c.LastUsedAt,
                c.BackupEligible,
                c.BackupState,
                transports,
                c.AaGuid,
                isCurrent
            );
        }).ToList();

        return Result.Success(result);
    }
}
