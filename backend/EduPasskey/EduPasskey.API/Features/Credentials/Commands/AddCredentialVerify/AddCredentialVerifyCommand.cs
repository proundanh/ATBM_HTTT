using EduPasskey.API.Messaging;
using Fido2NetLib;

namespace EduPasskey.API.Features.Credentials.Commands.AddCredentialVerify;

public record AddCredentialVerifyCommand(
    string CeremonyId,
    string? DeviceName,
    AuthenticatorAttestationRawResponse Credential
) : ICommand<AddCredentialVerifyResponse>;

public record AddCredentialVerifyResponse(
    Guid Id,
    string DeviceName,
    DateTimeOffset CreatedAt
);
