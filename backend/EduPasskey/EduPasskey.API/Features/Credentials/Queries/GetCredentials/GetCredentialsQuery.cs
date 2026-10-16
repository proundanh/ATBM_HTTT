using EduPasskey.API.Messaging;

namespace EduPasskey.API.Features.Credentials.Queries.GetCredentials;

public record GetCredentialsQuery : IQuery<List<CredentialItemDto>>;

public record CredentialItemDto(
    Guid Id,
    string? DeviceName,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastUsedAt,
    bool BackupEligible,
    bool BackupState,
    string[] Transports,
    Guid? Aaguid,
    bool IsCurrent
);
