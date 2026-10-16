using EduPasskey.API.Messaging;
using Fido2NetLib;

namespace EduPasskey.API.Features.Credentials.Commands.AddCredentialOptions;

public record AddCredentialOptionsCommand : ICommand<AddCredentialOptionsResponse>;

public record AddCredentialOptionsResponse(
    string CeremonyId,
    CredentialCreateOptions Options
);
