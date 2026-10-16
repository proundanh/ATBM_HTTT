using Fido2NetLib;

namespace EduPasskey.API.Caching;

public record StepUpCacheState(
    AssertionOptions Options,
    Guid UserId,
    string ActionHash
);
