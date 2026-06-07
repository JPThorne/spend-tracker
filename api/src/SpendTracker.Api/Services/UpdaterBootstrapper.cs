using System;
using System.IO;
using System.Reflection;
using Serilog;

namespace SpendTracker.Api.Services;

public static class UpdaterBootstrapper
{
    public static void EnsureUpdaterExists()
    {
        try
        {
            var currentDir = AppContext.BaseDirectory;
            var updaterPath = Path.Combine(currentDir, "SpendTrackerUpdater.exe");

            // If updater already exists, nothing to do
            if (File.Exists(updaterPath))
            {
                Log.Debug("Updater tool found at {Path}", updaterPath);
                return;
            }

            Log.Information("Extracting updater tool from embedded resources");
            ExtractUpdaterFromResources(updaterPath);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to extract updater tool");
        }
    }

    private static void ExtractUpdaterFromResources(string targetPath)
    {
        var assembly = Assembly.GetExecutingAssembly();
        var resourceName = "SpendTracker.Api.Resources.SpendTrackerUpdater.exe";

        using var resourceStream = assembly.GetManifestResourceStream(resourceName);
        if (resourceStream == null)
        {
            Log.Warning("Updater resource not found: {ResourceName}", resourceName);
            return;
        }

        using var fileStream = File.Create(targetPath);
        resourceStream.CopyTo(fileStream);
        Log.Information("Updater tool extracted to {Path}", targetPath);
    }
}
