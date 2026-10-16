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
                if (context != null)
                {
                    await ExecuteMigrations(context);
                    await SeedAdminUserAsync(context);
                }
                logger.LogInformation("Migrated postgres database.");

            }
            catch (Exception ex)
            {
                logger.LogError(ex, "An error occurred while migrating the database");
            }
        }

        return host;
    }

    private static Task ExecuteMigrations<TContext>(TContext context)
       where TContext : DbContext
    {
        return context.Database.MigrateAsync();
    }

    private static async Task SeedAdminUserAsync<TContext>(TContext context)
        where TContext : DbContext
    {
        if (context is EduPasskey.API.Data.AppDbContext dbContext)
        {
            var hasAdmin = await dbContext.Users.AnyAsync(u => u.Role == EduPasskey.API.Entities.UserRole.Admin);
            if (!hasAdmin)
            {
                var admin = new EduPasskey.API.Entities.User
                {
                    Id = Guid.NewGuid(),
                    StudentCode = "ADMIN001",
                    FullName = "Quản trị viên Hệ thống",
                    Email = "admin@school.edu.vn",
                    Role = EduPasskey.API.Entities.UserRole.Admin,
                    IsActive = true,
                    WebAuthnUserId = Guid.NewGuid().ToByteArray()
                };
                await dbContext.Users.AddAsync(admin);
                await dbContext.SaveChangesAsync();
            }
        }
    }
}
