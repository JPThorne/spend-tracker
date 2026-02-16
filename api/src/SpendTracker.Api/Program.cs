using Microsoft.EntityFrameworkCore;
using SpendTracker.Api.Middleware;
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

app.UseHttpsRedirection();
app.UseCors("AllowAll");

// Add API key authentication middleware
app.UseApiKeyAuthentication();

app.UseAuthorization();
app.MapControllers();

app.Run();