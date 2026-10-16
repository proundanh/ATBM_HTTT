using EduPasskey.API.Features.Profile.Queries.GetProfile;
using EduPasskey.API.Messaging;

namespace EduPasskey.API.Features.Profile.Commands.UpdateProfile;

public record UpdateProfileCommand(
    string? Phone,
    string Email,
    string? ScholarshipAccount,
    string? StepUpToken
) : ICommand<ProfileResponseDto>;
