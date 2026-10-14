using EduPasskey.API.Abstractions;
using EduPasskey.API.Extensions;
using EduPasskey.API.Features.Auth.Commands.RegisterOptions;
using EduPasskey.API.Features.Auth.Commands.RegisterVerify;
using MediatR;

namespace EduPasskey.API.Endpoints;

public class AuthEndpoints : IEndpointGroup
{
    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapApiV1Group("auth");

        group.MapPost("register/options", async (RegisterOptionsCommand command, ISender sender) =>
        {
            var result = await sender.Send(command);
            return result.ToHttpResult();
        });

        group.MapPost("register/verify", async (RegisterVerifyCommand command, ISender sender) =>
        {
            var result = await sender.Send(command);
            return result.ToHttpResult();
        });
    }


}
