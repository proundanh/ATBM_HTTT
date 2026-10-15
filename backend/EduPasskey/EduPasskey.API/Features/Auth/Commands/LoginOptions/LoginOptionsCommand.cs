using EduPasskey.API.Messaging;
using Fido2NetLib;

namespace EduPasskey.API.Features.Auth.Commands.LoginOptions;

public record LoginOptionsCommand(string? StudentCode = null) : ICommand<LoginOptionsResponse>;

public record LoginOptionsResponse(string CeremonyId, AssertionOptions Options);
