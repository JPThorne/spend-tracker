using System.Reflection;
using DbUp;
using DbUp.SQLite;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging;

namespace SpendTracker.Infrastructure.Data;

/// <summary>
/// Handles database migration using DbUp with embedded SQL scripts
/// </summary>
public static class DatabaseUpgrader
{
    /// <summary>
    /// Upgrades the database to the latest version by running all pending migration scripts
    /// </summary>
    /// <param name="connectionString">SQLite connection string</param>
    /// <param name="logger">Logger for output</param>
    public static void UpgradeDatabase(string connectionString, ILogger logger)
    {
        // Ensure the database file exists by creating a connection
        // SQLite will automatically create the file if it doesn't exist
        using (var connection = new SqliteConnection(connectionString))
        {
            connection.Open();
        }

        logger.LogInformation("Starting database migration...");

        // Configure DbUp to run embedded SQL scripts
        var upgrader = DeployChanges.To
            .SQLiteDatabase(connectionString)
            .WithScriptsEmbeddedInAssembly(
                Assembly.GetExecutingAssembly(),
                script => script.StartsWith("SpendTracker.Infrastructure.DatabaseMigrations.Scripts"))
            .LogToAutodetectedLog()
            .Build();

        // Execute the migration
        var result = upgrader.PerformUpgrade();

        if (!result.Successful)
        {
            logger.LogError(result.Error, "Database migration failed");
            throw new Exception("Database migration failed", result.Error);
        }

        logger.LogInformation("Database migration completed successfully");
        
        // Log which scripts were executed
        foreach (var script in result.Scripts)
        {
            logger.LogInformation("Executed migration script: {ScriptName}", script.Name);
        }
    }
}
