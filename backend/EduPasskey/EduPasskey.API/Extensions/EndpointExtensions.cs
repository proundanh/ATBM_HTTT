using EduPasskey.API.Abstractions;

namespace EduPasskey.API.Extensions;

public static class EndpointExtensions
{
    public static WebApplication MapEndpoints(this WebApplication app)
    {
        var groups = typeof(Program).Assembly
            .GetTypes()
            .Where(t => t.IsAssignableTo(typeof(IEndpointGroup)) && !t.IsInterface && !t.IsAbstract)
            .Select(Activator.CreateInstance)
            .Cast<IEndpointGroup>();

        foreach (var group in groups)
        {
            group.Map(app);
        }


        return app;
    }
}