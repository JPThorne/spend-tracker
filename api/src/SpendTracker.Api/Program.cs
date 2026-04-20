using System.Diagnostics;
using System.Runtime.InteropServices;
using Microsoft.EntityFrameworkCore;
using SpendTracker.Api;
using SpendTracker.Domain.Repositories;
using SpendTracker.Domain.Services;
using SpendTracker.Infrastructure.Data;
using SpendTracker.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// Configure SQLite Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                       ?? "Data Source=spendtracker.db";

builder.Services.AddDbContext<SpendTrackerDbContext>(options =>
    options.UseSqlite(connectionString));

// Register repositories
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<ITransactionRepository, TransactionRepository>();

// Register services
builder.Services.AddScoped<ICsvParsingService, CsvParsingService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<ITransactionService, TransactionService>();

// Configure CORS - Allow all origins for now
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

// Run database migrations using DbUp
var logger = app.Services.GetRequiredService<ILogger<Program>>();
DatabaseUpgrader.UpgradeDatabase(connectionString, logger);

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseDeveloperExceptionPage();
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseHttpsRedirection();
app.UseCors("AllowAll");

app.UseAuthorization();
app.MapControllers();

// Run the application with system tray support on Windows
if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
{
    // Initialize Windows Forms
    System.Windows.Forms.Application.EnableVisualStyles();
    System.Windows.Forms.Application.SetCompatibleTextRenderingDefault(false);
    
    // Create the tray application context with the web host
    var appUrl = "http://localhost:5000";
    var prefs = UserPreferences.Load();
    var manifestUrl = app.Configuration["UpdateManifestUrl"] ?? string.Empty;
    var context = new TrayApplicationContext(appUrl, app, prefs, manifestUrl);
    
    // Run the Windows Forms message loop
    System.Windows.Forms.Application.Run(context);
}
else
{
    // On non-Windows platforms, just run normally
    await app.RunAsync();
}
