using EduPasskey.API.Features.Credentials.Queries.GetCredentials;
using EduPasskey.API.Messaging;

namespace EduPasskey.API.Features.Credentials.Commands.RenameCredential;

public record RenameCredentialCommand(
    Guid Id,
    string DeviceName
) : ICommand<CredentialItemDto>;
