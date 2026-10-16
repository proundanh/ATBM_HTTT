using EduPasskey.API.Abstractions;
using EduPasskey.API.Extensions;
using EduPasskey.API.Features.Credentials.Commands.AddCredentialOptions;
using EduPasskey.API.Features.Credentials.Commands.AddCredentialVerify;
using EduPasskey.API.Features.Credentials.Commands.RenameCredential;
using EduPasskey.API.Features.Credentials.Commands.RevokeCredential;
using EduPasskey.API.Features.Credentials.Queries.GetCredentials;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EduPasskey.API.Endpoints;

public class CredentialEndpoints : IEndpointGroup
{
    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapApiV1Group("credentials").RequireAuthorization();

        // 9. GET /api/v1/credentials
        group.MapGet("", async (ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetCredentialsQuery(), ct);
            return result.ToHttpResult();
        });

        // 10. POST /api/v1/credentials/options
        group.MapPost("options", async (ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new AddCredentialOptionsCommand(), ct);
            return result.ToHttpResult();
        });

        // 11. POST /api/v1/credentials/verify
        group.MapPost("verify", async (AddCredentialVerifyCommand command, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.ToHttpResult(StatusCodes.Status201Created);
        });

        // 12. PATCH /api/v1/credentials/{id}
        group.MapPatch("{id:guid}", async (Guid id, [FromBody] RenameCredentialRequest request, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new RenameCredentialCommand(id, request.DeviceName), ct);
            return result.ToHttpResult();
        });

        // 13. DELETE /api/v1/credentials/{id}
        group.MapDelete("{id:guid}", async (Guid id, [FromHeader(Name = "X-StepUp-Token")] string? stepUpToken, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new RevokeCredentialCommand(id, stepUpToken), ct);
            return result.ToHttpResult(StatusCodes.Status204NoContent);
        });
    }
}

public record RenameCredentialRequest(string DeviceName);
