using EduPasskey.API.Shared;

namespace EduPasskey.API.Extensions;

public static class ResultExtensions
{
    /// <summary>
    /// Converts a <see cref="Result"/> directly to an <see cref="IResult"/> HTTP response,
    /// returning the result object itself with an HTTP status code derived from the error type (or 200 OK if successful).
    /// </summary>
    public static IResult ToHttpResult(this Result result, int successStatusCode = StatusCodes.Status200OK)
    {
        return Results.Json(result, statusCode: result.IsSuccess ? successStatusCode : GetStatusCode(result.Error));
    }

    /// <summary>
    /// Converts a <see cref="Result{T}"/> directly to an <see cref="IResult"/> HTTP response,
    /// returning the result object itself with an HTTP status code derived from the error type (or 200 OK if successful).
    /// </summary>
    public static IResult ToHttpResult<T>(this Result<T> result, int successStatusCode = StatusCodes.Status200OK)
    {
        return Results.Json(result, statusCode: result.IsSuccess ? successStatusCode : GetStatusCode(result.Error));
    }

    /// <summary>
    /// Maps an <see cref="Error"/> directly to an HTTP <see cref="IResult"/>,
    /// wrapping it in a failed <see cref="Result"/> and returning the appropriate HTTP status code.
    /// </summary>
    public static IResult ToHttpResult(this Error error)
    {
        var result = Result.Failure(error);
        return Results.Json(result, statusCode: GetStatusCode(error));
    }

    /// <summary>
    /// Alias for <see cref="ToHttpResult(Result, int)"/>.
    /// </summary>
    public static IResult ToResponse(this Result result, int successStatusCode = StatusCodes.Status200OK)
        => result.ToHttpResult(successStatusCode);

    /// <summary>
    /// Alias for <see cref="ToHttpResult{T}(Result{T}, int)"/>.
    /// </summary>
    public static IResult ToResponse<T>(this Result<T> result, int successStatusCode = StatusCodes.Status200OK)
        => result.ToHttpResult(successStatusCode);

    /// <summary>
    /// Retained for backward compatibility. Directly returns the <see cref="Result"/> with status code derived from the error.
    /// </summary>
    [Obsolete("ProblemDetails is no longer used. Use ToHttpResult instead.")]
    public static IResult ToProblemDetails(this Result result)
        => result.ToHttpResult();

    /// <summary>
    /// Retained for backward compatibility. Directly returns the <see cref="Result{T}"/> with status code derived from the error.
    /// </summary>
    [Obsolete("ProblemDetails is no longer used. Use ToHttpResult instead.")]
    public static IResult ToProblemDetails<T>(this Result<T> result)
        => result.ToHttpResult();

    // ──────────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Resolves the appropriate HTTP status code based on the concrete <see cref="Error"/> type.
    /// </summary>
    private static int GetStatusCode(Error? error) =>
        error switch
        {
            NotFoundError => StatusCodes.Status404NotFound,
            ConflictError => StatusCodes.Status409Conflict,
            ForbiddenError => StatusCodes.Status403Forbidden,
            ValidationError => StatusCodes.Status400BadRequest,
            FieldError => StatusCodes.Status400BadRequest,
            BadError => StatusCodes.Status400BadRequest,
            InternalError => StatusCodes.Status500InternalServerError,
            _ => StatusCodes.Status500InternalServerError,
        };
}
