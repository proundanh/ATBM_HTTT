using EduPasskey.API.Extensions;
using EduPasskey.API.Shared;
using FluentValidation;

namespace EduPasskey.API.Filters;

public sealed class ValidationFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        for (int i = 0; i < context.Arguments.Count; i++)
        {
            var argument = context.Arguments[i];
            if (argument is null)
                continue;

            var argumentType = argument.GetType();
            if (argumentType.IsPrimitive || argumentType == typeof(string) || argumentType == typeof(CancellationToken))
                continue;

            var validatorType = typeof(IValidator<>).MakeGenericType(argumentType);
            var validators = context.HttpContext.RequestServices
                .GetServices(validatorType)
                .Cast<IValidator>()
                .ToList();

            if (validators.Count > 0)
            {
                var validationContext = new ValidationContext<object>(argument);
                var validationResults = await Task.WhenAll(
                    validators.Select(v => v.ValidateAsync(validationContext, context.HttpContext.RequestAborted)));

                var failures = validationResults
                    .SelectMany(r => r.Errors)
                    .Where(f => f is not null)
                    .ToArray();

                if (failures.Length > 0)
                {
                    var validationError = ValidationError.FromFailures(failures);
                    return Result.Failure(validationError).ToHttpResult();
                }
            }
        }

        return await next(context);
    }
}

