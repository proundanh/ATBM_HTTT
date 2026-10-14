using Fido2NetLib;

namespace EduPasskey.API.Caching;

public record RegisterCacheState(
    CredentialCreateOptions Options,
    string StudentCode,
    string FullName,
    string Email,
    byte[] WebAuthnUserId
);