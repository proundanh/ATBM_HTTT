using EduPasskey.API.Messaging;

namespace EduPasskey.API.Features.Profile.Queries.GetProfile;

public record GetProfileQuery : IQuery<ProfileResponseDto>;

public record ProfileResponseDto(
    string StudentCode,
    string FullName,
    string Email,
    string? Class,
    string? Major,
    string? Phone,
    string? ScholarshipAccount,
    DateTimeOffset UpdatedAt
);
