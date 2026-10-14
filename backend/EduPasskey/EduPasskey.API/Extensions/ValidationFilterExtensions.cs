using EduPasskey.API.Filters;

namespace EduPasskey.API.Extensions;

public static class ValidationFilterExtensions
{
    /// <summary>
    /// Kích hoạt tự động validate bằng FluentValidation cho endpoint.
    /// </summary>
    public static RouteHandlerBuilder WithValidation(this RouteHandlerBuilder builder)
        => builder.AddEndpointFilter<ValidationFilter>();

    /// <summary>
    /// Kích hoạt tự động validate bằng FluentValidation cho toàn bộ route group.
    /// </summary>
    public static RouteGroupBuilder WithValidation(this RouteGroupBuilder group)
        => group.AddEndpointFilter<ValidationFilter>();
}
