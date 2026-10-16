using System.Text.Json;
using EduPasskey.API.Messaging;
using Fido2NetLib;

namespace EduPasskey.API.Features.Auth.Commands.StepUpOptions;

public record StepUpOptionsCommand(
    string Action,
    JsonElement Payload
) : ICommand<StepUpOptionsResponse>;

public record StepUpOptionsResponse(
    string CeremonyId,
    AssertionOptions Options
);
