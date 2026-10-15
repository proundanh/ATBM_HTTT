using Fido2NetLib;

namespace EduPasskey.API.Caching;

public record LoginCacheState(
    AssertionOptions Options,
    string? StudentCode
);
