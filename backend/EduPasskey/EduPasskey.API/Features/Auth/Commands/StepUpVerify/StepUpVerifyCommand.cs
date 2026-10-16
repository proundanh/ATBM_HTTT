using EduPasskey.API.Messaging;
using Fido2NetLib;

namespace EduPasskey.API.Features.Auth.Commands.StepUpVerify;

public record StepUpVerifyCommand(
    string CeremonyId,
    AuthenticatorAssertionRawResponse Credential
) : ICommand<StepUpVerifyResponse>;

public record StepUpVerifyResponse(
    string StepUpToken,
    int ExpiresInSeconds
);
