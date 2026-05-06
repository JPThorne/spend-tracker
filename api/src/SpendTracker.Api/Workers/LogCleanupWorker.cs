using Serilog;

namespace SpendTracker.Api.Workers;

public class LogCleanupWorker : BackgroundService
{
    private static readonly TimeSpan MaxLogAge = TimeSpan.FromDays(30);
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(6);
    private readonly string _logDirectory = Path.Combine(AppContext.BaseDirectory, "logs");

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        CleanOldLogs();
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(CleanupInterval, stoppingToken).ConfigureAwait(false);
            CleanOldLogs();
        }
    }

    private void CleanOldLogs()
    {
        if (!Directory.Exists(_logDirectory)) return;

        var cutoff = DateTime.UtcNow - MaxLogAge;
        try
        {
            foreach (var file in Directory.GetFiles(_logDirectory, "*.log"))
            {
                if (File.GetLastWriteTimeUtc(file) < cutoff)
                {
                    File.Delete(file);
                    Log.Information("Deleted old log file {FileName}", Path.GetFileName(file));
                }
            }
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to clean old log files in {LogDirectory}", _logDirectory);
        }
    }
}
