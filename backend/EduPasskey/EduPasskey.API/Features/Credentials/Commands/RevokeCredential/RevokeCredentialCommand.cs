using EduPasskey.API.Messaging;

namespace EduPasskey.API.Features.Credentials.Commands.RevokeCredential;

public record RevokeCredentialCommand(
    Guid Id,
    string? StepUpToken
) : ICommand;
