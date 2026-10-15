using System.Security.Claims;
using EduPasskey.API.Entities;
using EduPasskey.API.Messaging;
using EduPasskey.API.Services.Interfaces;
using EduPasskey.API.Shared;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace EduPasskey.API.Features.Auth.Commands.Logout;

public class LogoutCommandHandler(
    IHttpContextAccessor httpContextAccessor,
    ISecurityLogService securityLogService) : ICommandHandler<LogoutCommand>
{
    public async Task<Result> Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        var httpContext = httpContextAccessor.HttpContext;
        if (httpContext != null && httpContext.User.Identity?.IsAuthenticated == true)
        {
            var userIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var studentCode = httpContext.User.FindFirstValue("student_code");
            var credIdClaim = httpContext.User.FindFirstValue("amr_cred_id");

            Guid? userId = Guid.TryParse(userIdStr, out var u) ? u : null;
            byte[]? credId = credIdClaim != null ? Convert.FromBase64String(credIdClaim) : null;

            await securityLogService.WriteSuccessLogAsync(
                SecurityEventType.Logout,
                userId: userId,
                credentialId: credId,
                studentCodeAttempted: studentCode);

            await httpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        }

        return Result.Success();
    }
}
