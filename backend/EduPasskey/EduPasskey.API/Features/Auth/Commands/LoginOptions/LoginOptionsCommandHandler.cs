using EduPasskey.API.Caching;
using EduPasskey.API.Data;
using EduPasskey.API.Messaging;
using EduPasskey.API.Shared;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace EduPasskey.API.Features.Auth.Commands.LoginOptions;

public class LoginOptionsCommandHandler(
    AppDbContext context,
    IFido2 fido2,
    IMemoryCache cache) : ICommandHandler<LoginOptionsCommand, LoginOptionsResponse>
{
    public async Task<Result<LoginOptionsResponse>> Handle(LoginOptionsCommand request, CancellationToken cancellationToken)
    {
        var allowedCredentials = new List<PublicKeyCredentialDescriptor>();

        // 1. Nếu client truyền studentCode, tìm các credential còn hiệu lực của user
        if (!string.IsNullOrWhiteSpace(request.StudentCode))
        {
            var studentCode = request.StudentCode.Trim();
            var user = await context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.StudentCode == studentCode, cancellationToken);

            if (user != null)
            {
                var credentials = await context.StoredCredentials
                    .AsNoTracking()
                    .Where(c => c.UserId == user.Id && c.RevokedAt == null)
                    .ToListAsync(cancellationToken);

                allowedCredentials = credentials.Select(c => new PublicKeyCredentialDescriptor(c.CredentialId)).ToList();
            }
            // Nếu không tìm thấy user: vẫn giữ allowedCredentials rỗng để tránh User Enumeration
        }

        // 2. Tạo AssertionOptions từ Fido2NetLib v4.3
        var options = fido2.GetAssertionOptions(new GetAssertionOptionsParams
        {
            AllowedCredentials = allowedCredentials,
            UserVerification = UserVerificationRequirement.Required
        });

        // 3. Tạo CeremonyId và lưu vào Cache với TTL 120 giây
        var ceremonyId = Guid.NewGuid().ToString("N");
        var cacheKey = $"login_{ceremonyId}";
        var cacheState = new LoginCacheState(options, request.StudentCode);

        cache.Set(cacheKey, cacheState, TimeSpan.FromSeconds(120));

        return Result.Success(new LoginOptionsResponse(ceremonyId, options));
    }
}
