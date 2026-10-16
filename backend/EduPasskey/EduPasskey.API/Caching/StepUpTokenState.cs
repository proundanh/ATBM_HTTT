namespace EduPasskey.API.Caching;

public record StepUpTokenState(
    Guid UserId,
    string ActionHash
);
