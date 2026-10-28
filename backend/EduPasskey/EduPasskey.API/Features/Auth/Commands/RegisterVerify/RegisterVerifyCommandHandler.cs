using System.Security.Claims;
using EduPasskey.API.Caching;
using EduPasskey.API.Data;
using EduPasskey.API.Entities;
using EduPasskey.API.Messaging;
using EduPasskey.API.Services.Interfaces;
using EduPasskey.API.Shared;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
namespace EduPasskey.API.Features.Auth.Commands.RegisterVerify;

public class RegisterVerifyCommandHandler(
    ILogger<RegisterVerifyCommandHandler> logger,
    AppDbContext context,
    ISecurityLogService securityLogService,
    IFido2 fido2,
    IMemoryCache cache,
    IHttpContextAccessor httpContextAccessor) : ICommandHandler<RegisterVerifyCommand, RegisterVerifyResponse>
{
    public async Task<Result<RegisterVerifyResponse>> Handle(RegisterVerifyCommand request, CancellationToken cancellationToken)
    {
        var cacheKey = $"reg_{request.CeremonyId}";
        // 1. Lấy thông tin từ Cache
        if (!cache.TryGetValue(cacheKey, out RegisterCacheState? state) || state is null)
        {
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.RegisterFailed,
                failureReason: "Challenge expired or invalid ceremonyId",
                studentCodeAttempted: null);
            return Result.Failure<RegisterVerifyResponse>(
                new BadError("Phiên đăng ký đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.", "CHALLENGE_EXPIRED"));
        }
        // 2. Xóa ngay lập tức khỏi Cache (chống Replay Attack)
        cache.Remove(cacheKey);
        RegisteredPublicKeyCredential cred;
        try
        {
            // 3. Gọi Fido2 kiểm tra tính hợp lệ của chữ ký và Attestation
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
            logger.LogError(ex, "Fido2 MakeNewCredentialAsync failed for StudentCode {StudentCode}", state.StudentCode);
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.RegisterFailed,
                failureReason: ex.Message,
                studentCodeAttempted: state.StudentCode);
            return Result.Failure<RegisterVerifyResponse>(
                new BadError("Thông tin xác thực không hợp lệ. Đăng ký thất bại.", "ATTESTATION_INVALID"));
        }
        if (cred is null)
        {
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.RegisterFailed,
                failureReason: "Credential creation returned null",
                studentCodeAttempted: state.StudentCode);
            return Result.Failure<RegisterVerifyResponse>(
                new BadError("Không thể tạo thông tin xác thực. Vui lòng thử lại.", "ATTESTATION_INVALID"));
        }
        // 4. Tạo User
        var user = new User
        {
            Id = Guid.NewGuid(),
            WebAuthnUserId = state.WebAuthnUserId,
            StudentCode = state.StudentCode,
            FullName = state.FullName,
            Email = state.Email,
            Role = UserRole.Student,
            IsActive = true
        };
        // 5. Tạo StudentProfile rỗng (quan hệ 1-1)
        var profile = new StudentProfile
        {
            UserId = user.Id
        };
        // 6. Tạo StoredCredential từ kết quả của FIDO2 (chuẩn v4.3)
        var credential = new StoredCredential
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            CredentialId = cred.Id,
            PublicKey = cred.PublicKey,
            SignatureCounter = cred.SignCount,
            AaGuid = cred.AaGuid,
            DeviceName = request.DeviceName ?? "Thiết bị không tên",
            Transports = cred.Transports != null ? string.Join(",", cred.Transports) : null,
            BackupEligible = cred.IsBackupEligible,
            BackupState = cred.IsBackedUp
        };
        // 7. Lưu tất cả vào Database trong cùng 1 Transaction
        await context.Users.AddAsync(user, cancellationToken);
        await context.StudentProfiles.AddAsync(profile, cancellationToken);
        await context.StoredCredentials.AddAsync(credential, cancellationToken);
        // Ghi Audit Log thành công
        await securityLogService.StageSuccessLogAsync(
            SecurityEventType.RegisterSuccess,
            userId: user.Id,
            credentialId: credential.CredentialId,
            deviceName: credential.DeviceName,
            studentCodeAttempted: user.StudentCode);
        await context.SaveChangesAsync(cancellationToken);
        // 8. Tự động cấp Cookie đăng nhập cho User (SignIn)
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new("student_code", user.StudentCode),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("amr_cred_id", Convert.ToBase64String(credential.CredentialId)) // Claim định danh "Thiết bị này"
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var httpContext = httpContextAccessor.HttpContext;
        if (httpContext != null)
        {
            var authProperties = new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddHours(2)
            };

            await httpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(identity),
                authProperties);
        }
        logger.LogInformation("SUCCESS: User {StudentCode} registered successfully with Credential {CredId}", user.StudentCode, credential.Id);
        // 9. Trả về Response theo đúng đặc tả
        var response = new RegisterVerifyResponse(
            new UserDto(user.Id, user.StudentCode, user.FullName, user.Role.ToString()),
            new CredentialDto(credential.Id, credential.DeviceName, credential.CreatedAt)
        );
        return Result.Success(response);
    }
}
