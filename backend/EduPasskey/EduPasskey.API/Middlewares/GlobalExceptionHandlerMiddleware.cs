using EduPasskey.API.Shared;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;

namespace EduPasskey.API.Middlewares;

internal sealed class GlobalExceptionHandlerMiddleware(
    ILogger<GlobalExceptionHandlerMiddleware> logger,
    IHostEnvironment env)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (httpContext.Response.HasStarted)
        {
            logger.LogWarning("The response has already started, cannot write exception response.");
            return false;
        }

        var (statusCode, result) = exception switch
        {
            ValidationException validationEx => (
                StatusCodes.Status400BadRequest,
                Result.Failure(ValidationError.FromFailures(validationEx.Errors))
            ),
            KeyNotFoundException notFoundEx => (
                StatusCodes.Status404NotFound,
                Result.Failure(new NotFoundError("Resource", notFoundEx.Message))
            ),
            UnauthorizedAccessException unauthorizedEx => (
                StatusCodes.Status403Forbidden,
                Result.Failure(new ForbiddenError(unauthorizedEx.Message))
            ),
            _ => (
                StatusCodes.Status500InternalServerError,
                HandleUnexpectedException(exception)
            )
        };

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/json";

        await httpContext.Response.WriteAsJsonAsync(result, cancellationToken);

        return true;
    }

    private Result HandleUnexpectedException(Exception exception)
    {
        logger.LogError(exception, "Unhandled exception occurred: {Message}", exception.Message);

        var message = env.IsDevelopment()
            ? exception.Message
            : "An unexpected error occurred. Please try again later.";

        return Result.Failure(new InternalError(message));
    }
}
