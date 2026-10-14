using EduPasskey.API.Messaging;
using Fido2NetLib;

namespace EduPasskey.API.Features.Auth.Commands.RegisterOptions;

public record RegisterOptionsCommand(string StudentCode, string FullName, string Email) : ICommand<RegisterOptionsResponse>;


// RegisterOptionsResponse.cs
public record RegisterOptionsResponse(string CeremonyId, CredentialCreateOptions Options);