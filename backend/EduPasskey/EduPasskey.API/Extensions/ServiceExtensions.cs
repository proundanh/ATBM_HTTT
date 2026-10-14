using EduPasskey.API.Configurations;
using EduPasskey.API.Data;
using EduPasskey.API.Services.Implements;
using EduPasskey.API.Services.Interfaces;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

namespace EduPasskey.API.Extensions;

public static class ServiceExtensions
{
    public static void AddEduPasskeyServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddConfigurationSettings(configuration)
            .AddMediatRConfiguration()
            .ConfigureContext(configuration)
            .AddApplicationServices()
            .ConfigureCors()
            .ConfigureCache()
            .ConfigureAuthentication()
            .ConfigureFido2(configuration);
    }
    private static IServiceCollection AddConfigurationSettings(this IServiceCollection services,
       IConfiguration configuration)
    {

        var databaseSettings = configuration.GetSection(nameof(DatabaseSettings))
            .Get<DatabaseSettings>();
        if (databaseSettings is null || string.IsNullOrEmpty(databaseSettings.ConnectionString))
            throw new ArgumentNullException("Connection string is not configured.");

        services.AddSingleton(databaseSettings);



        return services;
    }

    private static IServiceCollection AddMediatRConfiguration(this IServiceCollection services)
    {
        // Register all FluentValidation validators
        services.AddValidatorsFromAssembly(typeof(Program).Assembly);

        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));
        return services;
    }


    private static IServiceCollection ConfigureContext(this IServiceCollection services, IConfiguration configuration)
    {
        var databaseSettings = configuration.GetSection(nameof(DatabaseSettings))
            .Get<DatabaseSettings>();
        if (databaseSettings is null || string.IsNullOrEmpty(databaseSettings.ConnectionString))
            throw new ArgumentNullException("Connection string is not configured.");

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(databaseSettings.ConnectionString));

        return services;
    }

    private static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ISecurityLogService, SecurityLogService>();

        return services;
    }

    private static IServiceCollection ConfigureCache(this IServiceCollection services)
    {
        services.AddMemoryCache();
        return services;
    }

    private static IServiceCollection ConfigureCors(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddDefaultPolicy(builder =>
            {
                builder.WithOrigins("http://localhost:5173")
                    .AllowAnyMethod()
                    .AllowCredentials()
                    .AllowAnyHeader();
            });
        });
        return services;
    }

    private static IServiceCollection ConfigureAuthentication(this IServiceCollection services)
    {
        services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(options =>
            {
                options.Cookie.Name = "StudentPortal.Auth";
                options.Cookie.HttpOnly = true;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
                options.ExpireTimeSpan = TimeSpan.FromHours(2);
                options.SlidingExpiration = true;

                // Với Web API, khi chưa đăng nhập trả về mã 401 thay vì Redirect 302 của MVC
                options.Events.OnRedirectToLogin = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return Task.CompletedTask;
                };

                // Khi không đủ quyền (Role), trả về 403 Forbidden thay vì Redirect 302
                options.Events.OnRedirectToAccessDenied = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return Task.CompletedTask;
                };
            });

        return services;
    }

    private static IServiceCollection ConfigureFido2(this IServiceCollection services, IConfiguration configuration)
    {
        var fido2Settings = configuration.GetSection(nameof(Fido2Settings))
            .Get<Fido2Settings>();

        if (fido2Settings is null || string.IsNullOrEmpty(fido2Settings.RPID))
        {
            throw new ArgumentNullException(nameof(fido2Settings), "Fido2 configuration is not configured.");
        }

        services.AddSingleton(fido2Settings);

        services.AddFido2(options =>
        {
            options.RPID = fido2Settings.RPID;
            options.RPName = fido2Settings.RPName;
            options.Origins = fido2Settings.Origins?.ToHashSet() ?? new HashSet<string> { "http://localhost:5173", "http://localhost:5105" };
            options.TimestampDriftTolerance = fido2Settings.TimestampDriftTolerance;
        });

        return services;
    }



    public static IEndpointConventionBuilder ConfigureScalar(this IEndpointRouteBuilder endpoints,
        string? title = null,
        Action<ScalarOptions>? configure = null)
    {
        ArgumentNullException.ThrowIfNull(endpoints);

        var appTitle = title ?? endpoints.ServiceProvider.GetService<IHostEnvironment>()?.ApplicationName ?? "API Reference";

        return endpoints.MapScalarApiReference(options =>
        {
            options
                .WithTitle(appTitle)
                .WithTheme(ScalarTheme.DeepSpace)          // dark theme
                .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);

            // Sidebar is shown by default — no need to call WithSidebar(true)
            // Proxy disabled: requests go directly to your API, not through proxy.scalar.com

            configure?.Invoke(options);
        });
    }
}
