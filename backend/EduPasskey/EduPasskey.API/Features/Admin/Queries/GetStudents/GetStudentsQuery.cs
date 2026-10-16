using EduPasskey.API.Messaging;

namespace EduPasskey.API.Features.Admin.Queries.GetStudents;

public record GetStudentsQuery(
    string? Search = null,
    int Page = 1,
    int PageSize = 20
) : IQuery<PagedStudentsResponse>;

public record StudentItemDto(
    Guid UserId,
    string StudentCode,
    string FullName,
    string Email,
    string? Class,
    string? Major,
    bool IsActive,
    int CredentialCount,
    DateTimeOffset? LastLoginAt
);

public record PagedStudentsResponse(
    List<StudentItemDto> Items,
    int Page,
    int PageSize,
    int Total
);
