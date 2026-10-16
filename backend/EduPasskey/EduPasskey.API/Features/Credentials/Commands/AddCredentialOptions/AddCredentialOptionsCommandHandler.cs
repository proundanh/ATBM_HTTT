using System.Security.Claims;
using EduPasskey.API.Caching;
using EduPasskey.API.Data;
using EduPasskey.API.Messaging;
using EduPasskey.API.Shared;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace EduPasskey.API.Features.Credentials.Commands.AddCredentialOptions;

public class AddCredentialOptionsCommandHandler(
    AppDbContext context,
    IFido2 fido2,
    IMemoryCache cache,
    IHttpContextAccessor httpContextAccessor) : ICommandHandler<AddCredentialOptionsCommand, AddCredentialOptionsResponse>
{
    public async Task<Result<AddCredentialOptionsResponse>> Handle(AddCredentialOptionsCommand request, CancellationToken cancellationToken)
    {
        var httpContext = httpContextAccessor.HttpContext;
        var userIdStr = httpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
        {
            return Result.Failure<AddCredentialOptionsResponse>(new UnauthorizedError("Bạn cần đăng nhập.", "UNAUTHORIZED"));
        }

        var user = await context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == currentUserId, cancellationToken);

        if (user is null)
        {
            return Result.Failure<AddCredentialOptionsResponse>(new NotFoundError("User", currentUserId));
        }

        // Lấy danh sách credential đã có (chưa revoked) để gán excludeCredentials
        var existingCreds = await context.StoredCredentials
            .AsNoTracking()
            .Where(c => c.UserId == currentUserId && c.RevokedAt == null)
            .ToListAsync(cancellationToken);

        var excludeCredentials = existingCreds
            .Select(c => new PublicKeyCredentialDescriptor(c.CredentialId))
            .ToList();

        var fidoUser = new Fido2User
        {
            Id = user.WebAuthnUserId,
            Name = user.StudentCode,
            DisplayName = user.FullName
        };

        var authenticatorSelection = new AuthenticatorSelection
        {
            ResidentKey = ResidentKeyRequirement.Required,
            UserVerification = UserVerificationRequirement.Required
        };

        var options = fido2.RequestNewCredential(new RequestNewCredentialParams
        {
            User = fidoUser,
            AuthenticatorSelection = authenticatorSelection,
            AttestationPreference = AttestationConveyancePreference.None,
            ExcludeCredentials = excludeCredentials
        });

        var ceremonyId = Guid.NewGuid().ToString("N");
        var cacheKey = $"add_cred_{ceremonyId}";
        var cacheState = new AddCredentialCacheState(options, currentUserId);

        cache.Set(cacheKey, cacheState, TimeSpan.FromSeconds(120));

        return Result.Success(new AddCredentialOptionsResponse(ceremonyId, options));
    }
}
