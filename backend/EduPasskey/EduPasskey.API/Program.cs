using EduPasskey.API.Data;
using EduPasskey.API.Extensions;
using EduPasskey.API.Middlewares;
using Serilog;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);


Log.Information($"Start {builder.Environment.ApplicationName} up");
try
{

    builder.Host.AddAppConfigurations();

    builder.Services.AddEduPasskeyServices(builder.Configuration);


    // Add services to the container.
    builder.Services.AddControllers();
    builder.Services.AddOpenApi("v1");
    builder.AddEduKeyuPassApiVersioning();
    // Register Global Exception Handler
    builder.Services.AddExceptionHandler<GlobalExceptionHandlerMiddleware>();
    builder.Services.AddProblemDetails();

    WebApplication app = builder.Build();

    await app.MigrateDatabase<AppDbContext>();
    // Global Exception & Validation Handling
    app.UseExceptionHandler();

    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        app.ConfigureScalar();
    }

    app.UseHttpsRedirection();

    app.UseCors();

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapEndpoints();
    app.MapControllers();


    app.MapGet("/", () => Results.Redirect("/scalar"));

    await app.RunAsync();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Application start-up failed");
}
finally
{
    Log.CloseAndFlush();
}

