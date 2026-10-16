using EduPasskey.API.Abstractions;
using EduPasskey.API.Extensions;
using EduPasskey.API.Features.Auth.Commands.LoginOptions;
using EduPasskey.API.Features.Auth.Commands.LoginVerify;
using EduPasskey.API.Features.Auth.Commands.Logout;
using EduPasskey.API.Features.Auth.Commands.RegisterOptions;
using EduPasskey.API.Features.Auth.Commands.RegisterVerify;
using EduPasskey.API.Features.Auth.Queries.GetMe;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EduPasskey.API.Endpoints;

public class AuthEndpoints : IEndpointGroup
{
    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapApiV1Group("auth");

        // 1. POST /api/v1/auth/register/options
        group.MapPost("register/options", async (RegisterOptionsCommand command, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.ToHttpResult();
        });

        // 2. POST /api/v1/auth/register/verify
        group.MapPost("register/verify", async (RegisterVerifyCommand command, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.ToHttpResult(StatusCodes.Status201Created);
        });

        // 3. POST /api/v1/auth/login/options
        group.MapPost("login/options", async ([FromBody] LoginOptionsCommand? command, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command ?? new LoginOptionsCommand(), ct);
            return result.ToHttpResult();
        });

        // 4. POST /api/v1/auth/login/verify
        group.MapPost("login/verify", async (LoginVerifyCommand command, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.ToHttpResult();
        });

        // 5. POST /api/v1/auth/logout
        group.MapPost("logout", async (ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new LogoutCommand(), ct);
            return result.ToHttpResult(StatusCodes.Status204NoContent);
        });

        // 6. GET /api/v1/auth/me
        group.MapGet("me", async (ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetMeQuery(), ct);
            return result.ToHttpResult();
        });

        // 7. POST /api/v1/auth/stepup/options
        group.MapPost("stepup/options", async (EduPasskey.API.Features.Auth.Commands.StepUpOptions.StepUpOptionsCommand command, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.ToHttpResult();
        }).RequireAuthorization();

        // 8. POST /api/v1/auth/stepup/verify
        group.MapPost("stepup/verify", async (EduPasskey.API.Features.Auth.Commands.StepUpVerify.StepUpVerifyCommand command, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.ToHttpResult();
        }).RequireAuthorization();
    }
}
