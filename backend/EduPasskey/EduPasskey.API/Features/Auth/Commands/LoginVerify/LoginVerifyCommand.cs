using EduPasskey.API.Features.Auth.Commands.RegisterVerify;
using EduPasskey.API.Messaging;
using Fido2NetLib;

namespace EduPasskey.API.Features.Auth.Commands.LoginVerify;

public record LoginVerifyCommand(
    string CeremonyId,
    AuthenticatorAssertionRawResponse Credential
) : ICommand<LoginVerifyResponse>;

public record LoginVerifyResponse(UserDto User);
