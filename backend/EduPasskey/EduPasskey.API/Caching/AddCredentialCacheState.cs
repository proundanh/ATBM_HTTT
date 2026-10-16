using Fido2NetLib;

namespace EduPasskey.API.Caching;

public record AddCredentialCacheState(
    CredentialCreateOptions Options,
    Guid UserId
);
