using System.Reflection;
using System.Runtime.InteropServices;
using Microsoft.Extensions.FileProviders;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Serilog.Events;
using SpendTracker.Api;
using SpendTracker.Api.Workers;
using SpendTracker.Domain.Repositories;
using SpendTracker.Domain.Services;
using SpendTracker.Infrastructure.Data;
using SpendTracker.Infrastructure.Repositories;

var logDirectory = Path.Combine(AppContext.BaseDirectory, "logs");
Directory.CreateDirectory(logDirectory);

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.File(
        path: Path.Combine(logDirectory, "spendtracker-.log"),
        rollingInterval: RollingInterval.Day,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}"
    )
    .CreateLogger();

try
{
    var version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "unknown";
    Log.Information("SpendTracker {Version} starting up. Log directory: {LogDirectory}", version, logDirectory);

    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog();

    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddOpenApi();
    builder.Services.AddHostedService<LogCleanupWorker>();

    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                           ?? "Data Source=spendtracker.db";

    builder.Services.AddDbContext<SpendTrackerDbContext>(options =>
        options.UseSqlite(connectionString));

    builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
    builder.Services.AddScoped<ITransactionRepository, TransactionRepository>();

    builder.Services.AddScoped<ICsvParsingService, CsvParsingService>();
    builder.Services.AddScoped<ICategoryService, CategoryService>();
    builder.Services.AddScoped<ITransactionService, TransactionService>();

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowAll", policy =>
        {
            policy.AllowAnyOrigin()
                .AllowAnyMethod()
                .AllowAnyHeader();
        });
    });

    var app = builder.Build();

    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    DatabaseUpgrader.UpgradeDatabase(connectionString, logger);

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        app.UseDeveloperExceptionPage();
    }

    var embeddedProvider = new EmbeddedFileProvider(
        Assembly.GetExecutingAssembly(),
        "SpendTracker.Api.wwwroot"
    );
    app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = embeddedProvider });
    app.UseStaticFiles(new StaticFileOptions { FileProvider = embeddedProvider });
    app.UseHttpsRedirection();
    app.UseCors("AllowAll");

    app.UseAuthorization();
    app.MapControllers();

    Log.Information("SpendTracker ready at http://localhost:5000");

    if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
    {
        System.Windows.Forms.Application.EnableVisualStyles();
        System.Windows.Forms.Application.SetCompatibleTextRenderingDefault(false);

        var appUrl = "http://localhost:5000";
        var prefs = UserPreferences.Load();
        var manifestUrl = app.Configuration["UpdateManifestUrl"] ?? string.Empty;
        var context = new TrayApplicationContext(appUrl, app, prefs, manifestUrl);

        System.Windows.Forms.Application.Run(context);
    }
    else
    {
        await app.RunAsync();
    }

    Log.Information("SpendTracker shut down cleanly");
}
catch (Exception ex)
{
    Log.Fatal(ex, "SpendTracker terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
