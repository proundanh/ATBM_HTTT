using EduPasskey.API.Messaging;
using Fido2NetLib;

namespace EduPasskey.API.Features.Auth.Commands.RegisterVerify;

public record RegisterVerifyCommand(string CeremonyId,
    string? DeviceName,
    AuthenticatorAttestationRawResponse Credential) : ICommand<RegisterVerifyResponse>
{
}


public record UserDto(
    Guid Id,
    string StudentCode,
    string FullName,
    string Role
);
public record CredentialDto(
    Guid Id,
    string DeviceName,
    DateTimeOffset CreatedAt
);
public record RegisterVerifyResponse(
    UserDto User,
    CredentialDto Credential
);
