using System.Security.Cryptography;
using EduPasskey.API.Caching;
using EduPasskey.API.Data;
using EduPasskey.API.Messaging;
using EduPasskey.API.Shared;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace EduPasskey.API.Features.Auth.Commands.RegisterOptions;

public class RegisterOptionsCommandHandler(
    ILogger<RegisterOptionsCommandHandler> logger,
    AppDbContext context,
    IFido2 fido2,
    IMemoryCache cache) : ICommandHandler<RegisterOptionsCommand, RegisterOptionsResponse>
{
    public async Task<Result<RegisterOptionsResponse>> Handle(RegisterOptionsCommand request, CancellationToken cancellationToken)
    {
        var studentCode = request.StudentCode.Trim().ToUpper();
        var email = request.Email.Trim().ToLower();

        logger.LogInformation("BEGIN: RegisterOptions for StudentCode {StudentCode}", studentCode);

        // 1. Kiểm tra xem MSSV đã được đăng ký chưa
        bool isStudentCodeTaken = await context.Users.AnyAsync(s => s.StudentCode == studentCode, cancellationToken);
        if (isStudentCodeTaken)
        {
            logger.LogWarning("RegisterOptions FAILED: StudentCode {StudentCode} already exists", studentCode);
            return Result.Failure<RegisterOptionsResponse>(
                new ConflictError("Mã số sinh viên đã được đăng ký trong hệ thống.", "STUDENT_CODE_TAKEN"));
        }

        // 2. Kiểm tra xem Email đã được sử dụng chưa
        bool isEmailTaken = await context.Users.AnyAsync(s => s.Email == email, cancellationToken);
        if (isEmailTaken)
        {
            logger.LogWarning("RegisterOptions FAILED: Email {Email} already exists", email);
            return Result.Failure<RegisterOptionsResponse>(
                new ConflictError("Email đã được sử dụng.", "EMAIL_TAKEN"));
        }

        // 3. Tạo WebAuthn User Handle ngẫu nhiên (32 bytes)
        var userHandle = RandomNumberGenerator.GetBytes(32);
        var fido2User = new Fido2User
        {
            Id = userHandle,
            DisplayName = request.FullName.Trim(),
            Name = studentCode
        };

        // 4. Cấu hình yêu cầu Authenticator
        var authenticatorSelection = new AuthenticatorSelection
        {
            ResidentKey = ResidentKeyRequirement.Required,          // Passkey discoverable (không cần gõ MSSV khi login)
            UserVerification = UserVerificationRequirement.Required // Bắt buộc quét vân tay / FaceID / PIN
        };

        // 5. Yêu cầu Fido2 sinh Challenge & Options
        var options = fido2.RequestNewCredential(
            new RequestNewCredentialParams
            {
                User = fido2User,
                AuthenticatorSelection = authenticatorSelection,
                AttestationPreference = AttestationConveyancePreference.None
            }
        );

        // 6. Sinh ceremonyId ngẫu nhiên và lưu tạm vào IMemoryCache (TTL 120s)
        var ceremonyId = Convert.ToHexString(RandomNumberGenerator.GetBytes(16));
        var cacheState = new RegisterCacheState(options, studentCode, request.FullName.Trim(), email, userHandle);

        cache.Set($"reg_{ceremonyId}", cacheState, TimeSpan.FromSeconds(120));

        logger.LogInformation("SUCCESS: RegisterOptions generated with CeremonyId {CeremonyId}", ceremonyId);

        return Result.Success(new RegisterOptionsResponse(ceremonyId, options));
    }
}
