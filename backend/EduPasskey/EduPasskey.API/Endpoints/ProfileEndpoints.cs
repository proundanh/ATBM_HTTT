using EduPasskey.API.Abstractions;
using EduPasskey.API.Extensions;
using EduPasskey.API.Features.Profile.Commands.UpdateProfile;
using EduPasskey.API.Features.Profile.Queries.GetProfile;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EduPasskey.API.Endpoints;

public class ProfileEndpoints : IEndpointGroup
{
    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapApiV1Group("profile").RequireAuthorization();

        // 14. GET /api/v1/profile
        group.MapGet("", async (ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetProfileQuery(), ct);
            return result.ToHttpResult();
        });

        // 15. PUT /api/v1/profile
        group.MapPut("", async (
            [FromBody] UpdateProfileRequest request,
            [FromHeader(Name = "X-StepUp-Token")] string? stepUpToken,
            ISender sender,
            CancellationToken ct) =>
        {
            var command = new UpdateProfileCommand(request.Phone, request.Email, request.ScholarshipAccount, stepUpToken);
            var result = await sender.Send(command, ct);
            return result.ToHttpResult();
        });
    }
}

public record UpdateProfileRequest(
    string? Phone,
    string Email,
    string? ScholarshipAccount
);
