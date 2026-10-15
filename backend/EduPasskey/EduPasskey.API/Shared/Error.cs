namespace EduPasskey.API.Shared;

/// <summary>
/// Base error type carrying a machine-readable code and human-readable message.
/// </summary>
public abstract record Error(string Code, string Message);

/// <summary>Resource was not found — maps to HTTP 404.</summary>
public record NotFoundError(string Entity, object Id)
    : Error("NotFound", $"{Entity} with ID '{Id}' was not found.");

/// <summary>
/// Aggregates one or more field-level validation failures — maps to HTTP 400.
/// Use <see cref="ValidationError.FromFailures"/> to build from FluentValidation results.
/// </summary>
/// 
public sealed record ValidationError : Error
{
    public ValidationError(Error[] errors)
        : base("ValidationError", "One or more validation errors occurred.")
    {
        Errors = errors;
    }

    /// <summary>Individual field-level errors.</summary>
    public Error[] Errors { get; }

    /// <summary>
    /// Builds a <see cref="ValidationError"/> from a list of failed <see cref="Result"/>s.
    /// </summary>
    public static ValidationError FromResults(IEnumerable<Result> results) =>
        new(results.Where(r => r.IsFailure).Select(r => r.Error!).ToArray());

    /// <summary>
    /// Builds a <see cref="ValidationError"/> from FluentValidation validation failures.
    /// </summary>
    public static ValidationError FromFailures(IEnumerable<FluentValidation.Results.ValidationFailure> failures) =>
        new(failures
            .Where(f => f is not null)
            .Select(f => (Error)new FieldError(f.PropertyName, f.ErrorMessage))
            .ToArray());
}

/// <summary>
/// A single field-level validation failure — used as a child error inside <see cref="ValidationError"/>.
/// </summary>
public record FieldError(string Field, string Message)
    : Error("validation.field", Message);

/// <summary>A business rule conflict occurred — maps to HTTP 409.</summary>
public record ConflictError(string Message, string Code = "Conflict")
    : Error(Code, Message);

/// <summary>The caller is not authorised to perform the action — maps to HTTP 403.</summary>
public record ForbiddenError(string Message, string Code = "Forbidden")
    : Error(Code, Message);

/// <summary>The caller is not authenticated — maps to HTTP 401.</summary>
public record UnauthorizedError(string Message, string Code = "Unauthorized")
    : Error(Code, Message);

/// <summary>A catch-all for unexpected domain failures — maps to HTTP 400.</summary>
public record BadError(string Message, string Code = "BadRequest")
    : Error(Code, Message);

/// <summary>An unexpected internal server error — maps to HTTP 500.</summary>
public record InternalError(string Message = "An unexpected error occurred.")
    : Error("InternalServerError", Message);
