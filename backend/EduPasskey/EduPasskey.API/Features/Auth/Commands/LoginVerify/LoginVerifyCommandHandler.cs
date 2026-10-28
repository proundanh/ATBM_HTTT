using System.Security.Claims;
using EduPasskey.API.Caching;
using EduPasskey.API.Data;
using EduPasskey.API.Entities;
using EduPasskey.API.Features.Auth.Commands.RegisterVerify;
using EduPasskey.API.Messaging;
using EduPasskey.API.Services.Interfaces;
using EduPasskey.API.Shared;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace EduPasskey.API.Features.Auth.Commands.LoginVerify;

public class LoginVerifyCommandHandler(
    ILogger<LoginVerifyCommandHandler> logger,
    AppDbContext context,
    ISecurityLogService securityLogService,
    IFido2 fido2,
    IMemoryCache cache,
    IHttpContextAccessor httpContextAccessor) : ICommandHandler<LoginVerifyCommand, LoginVerifyResponse>
{
    public async Task<Result<LoginVerifyResponse>> Handle(LoginVerifyCommand request, CancellationToken cancellationToken)
    {
        var cacheKey = $"login_{request.CeremonyId}";

        // 1. Lấy thông tin từ Cache
        if (!cache.TryGetValue(cacheKey, out LoginCacheState? state) || state is null)
        {
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.LoginFailed,
                failureReason: "Challenge expired or invalid ceremonyId",
                studentCodeAttempted: null);

            return Result.Failure<LoginVerifyResponse>(
                new BadError("Phiên xác thực đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.", "CHALLENGE_EXPIRED"));
        }

        // Xóa Cache ngay lập tức để chống Replay Attack
        cache.Remove(cacheKey);

        // 2. Tìm Credential trong DB
        var storedCred = await context.StoredCredentials
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.CredentialId == request.Credential.RawId, cancellationToken);

        if (storedCred is null)
        {
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.LoginFailed,
                failureReason: "Credential not found",
                studentCodeAttempted: state.StudentCode);

            return Result.Failure<LoginVerifyResponse>(
                new UnauthorizedError("Thông tin xác thực không hợp lệ.", "ASSERTION_INVALID"));
        }

        // 3. Kiểm tra xem thiết bị đã bị thu hồi chưa
        if (storedCred.RevokedAt != null)
        {
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.LoginFailed,
                failureReason: "Credential has been revoked",
                studentCodeAttempted: storedCred.User.StudentCode);

            return Result.Failure<LoginVerifyResponse>(
                new UnauthorizedError("Thiết bị này đã bị thu hồi quyền truy cập.", "CREDENTIAL_REVOKED"));
        }

        var user = storedCred.User;

        // 4. Kiểm tra tài khoản có bị khóa không
        if (!user.IsActive)
        {
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.LoginFailed,
                failureReason: "User is inactive",
                studentCodeAttempted: user.StudentCode);

            return Result.Failure<LoginVerifyResponse>(
                new ForbiddenError("Tài khoản đã bị tạm khóa.", "USER_INACTIVE"));
        }

        // 5. Xác minh chữ ký số thông qua Fido2NetLib
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
                    {
                        return Task.FromResult(true);
                    }
                    var isOwner = user.WebAuthnUserId.SequenceEqual(args.UserHandle);
                    return Task.FromResult(isOwner);
                }
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fido2 MakeAssertionAsync failed for Student {StudentCode}", user.StudentCode);
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.LoginFailed,
                failureReason: ex.Message,
                studentCodeAttempted: user.StudentCode);

            return Result.Failure<LoginVerifyResponse>(
                new UnauthorizedError("Xác thực chữ ký số thất bại.", "ASSERTION_INVALID"));
        }

        // 6. Kiểm tra Signature Counter Rollback (chống clone khóa)
        if (storedCred.SignatureCounter > 0 && assertionResult.SignCount <= storedCred.SignatureCounter)
        {
            logger.LogWarning("DETECTED COUNTER ROLLBACK for Credential {Id}", storedCred.Id);
            await securityLogService.WriteFailureLogAsync(
                SecurityEventType.LoginFailed,
                failureReason: "Signature counter rollback detected",
                studentCodeAttempted: user.StudentCode);

            return Result.Failure<LoginVerifyResponse>(
                new UnauthorizedError("Phát hiện bất thường về bảo mật từ thiết bị của bạn.", "COUNTER_ROLLBACK"));
        }

        // 7. Cập nhật trạng thái Credential & Transaction DB
        storedCred.SignatureCounter = assertionResult.SignCount;
        storedCred.LastUsedAt = DateTime.UtcNow;

        await securityLogService.StageSuccessLogAsync(
            SecurityEventType.LoginSuccess,
            userId: user.Id,
            credentialId: storedCred.CredentialId,
            deviceName: storedCred.DeviceName,
            signCountUsed: assertionResult.SignCount,
            studentCodeAttempted: user.StudentCode);

        await context.SaveChangesAsync(cancellationToken);

        // 8. Đăng nhập Cookie cho phiên người dùng
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim("student_code", user.StudentCode),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("amr_cred_id", Convert.ToBase64String(storedCred.CredentialId))
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

        logger.LogInformation("User {StudentCode} logged in successfully.", user.StudentCode);

        return Result.Success(new LoginVerifyResponse(
            new UserDto(user.Id, user.StudentCode, user.FullName, user.Role.ToString())
        ));
    }
}
