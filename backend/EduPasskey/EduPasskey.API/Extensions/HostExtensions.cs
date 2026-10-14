using EduPasskey.API.Logging;
using Microsoft.EntityFrameworkCore;
using Serilog;

namespace EduPasskey.API.Extensions;

public static class HostExtensions
{
    public static void AddAppConfigurations(this ConfigureHostBuilder host)
    {
        host.ConfigureAppConfiguration((context, config) =>
        {
            IHostEnvironment env = context.HostingEnvironment;
            config.AddJsonFile("appsettings.json", false, true)
                .AddJsonFile($"appsettings.{env.EnvironmentName}.json", true, true)
                .AddEnvironmentVariables();
        }).UseSerilog(Serilogger.Configure);
    }



    public static async Task<IHost> MigrateDatabase<TContext>(this IHost host)
        where TContext : DbContext
    {
        using (var scope = host.Services.CreateScope())
        {
            var services = scope.ServiceProvider;
            var logger = services.GetRequiredService<ILogger<TContext>>();
            var context = services.GetService<TContext>();

            try
            {
                logger.LogInformation("Migrating postgres database.");
                await ExecuteMigrations(context);
                logger.LogInformation("Migrated postgres database.");

            }
            catch (Exception ex)
            {
                logger.LogError(ex, "An error occurred while migrating the mysql database");
            }
        }

        return host;
    }

    private static Task ExecuteMigrations<TContext>(TContext context)
       where TContext : DbContext
    {
        return context.Database.MigrateAsync();
    }
}
