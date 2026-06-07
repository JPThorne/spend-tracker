using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Reflection;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Xml;
using Serilog;

namespace SpendTracker.Api.Services;

public interface IUpdateChecker
{
    Task<UpdateInfo?> CheckForUpdatesAsync(string manifestUrl);
    Task<bool> DownloadUpdateAsync(string downloadUrl, string savePath);
}

public class UpdateInfo
{
    public string? Version { get; set; }
    public string? DownloadUrl { get; set; }
    public bool IsUpdateAvailable { get; set; }
}

public class UpdateChecker : IUpdateChecker
{
    private static readonly HttpClient Client = new();
    private static readonly string UpdateDirectory = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "SpendTracker",
        "Updates"
    );

    public UpdateChecker()
    {
        Directory.CreateDirectory(UpdateDirectory);
    }

    public async Task<UpdateInfo?> CheckForUpdatesAsync(string manifestUrl)
    {
        try
        {
            var response = await Client.GetAsync(manifestUrl);
            if (!response.IsSuccessStatusCode)
            {
                Log.Warning("Failed to fetch update manifest from {Url}: {StatusCode}", manifestUrl, response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var updateInfo = ParseUpdateManifest(content);

            if (updateInfo == null)
            {
                Log.Warning("Failed to parse update manifest from {Url}", manifestUrl);
                return null;
            }

            var currentVersion = GetCurrentVersion();
            updateInfo.IsUpdateAvailable = CompareVersions(currentVersion, updateInfo.Version) < 0;

            if (updateInfo.IsUpdateAvailable)
            {
                Log.Information("Update available: current={Current} available={Available} url={Url}",
                    currentVersion, updateInfo.Version, updateInfo.DownloadUrl);
            }
            else
            {
                Log.Information("No update available: current version is {Version}", currentVersion);
            }

            return updateInfo;
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Error checking for updates from {Url}", manifestUrl);
            return null;
        }
    }

    public async Task<bool> DownloadUpdateAsync(string downloadUrl, string fileName)
    {
        try
        {
            var savePath = Path.Combine(UpdateDirectory, fileName);
            var tempPath = savePath + ".tmp";

            // Clean up any previous temp files
            if (File.Exists(tempPath))
                File.Delete(tempPath);

            Log.Information("Downloading update from {Url} to {SavePath}", downloadUrl, savePath);

            var response = await Client.GetAsync(downloadUrl);
            if (!response.IsSuccessStatusCode)
            {
                Log.Error("Failed to download update from {Url}: {StatusCode}", downloadUrl, response.StatusCode);
                return false;
            }

            await using var contentStream = await response.Content.ReadAsStreamAsync();
            await using var fileStream = File.Create(tempPath);
            await contentStream.CopyToAsync(fileStream);

            // Atomic rename
            if (File.Exists(savePath))
                File.Delete(savePath);
            File.Move(tempPath, savePath);

            Log.Information("Update downloaded successfully to {SavePath}", savePath);
            return true;
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Error downloading update from {Url}", downloadUrl);
            return false;
        }
    }

    private UpdateInfo? ParseUpdateManifest(string xmlContent)
    {
        try
        {
            var doc = new XmlDocument();
            doc.LoadXml(xmlContent);

            var versionNode = doc.SelectSingleNode("//item/version");
            var urlNode = doc.SelectSingleNode("//item/url");

            if (versionNode?.InnerText == null || urlNode?.InnerText == null)
                return null;

            return new UpdateInfo
            {
                Version = versionNode.InnerText,
                DownloadUrl = urlNode.InnerText,
                IsUpdateAvailable = false
            };
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Error parsing update manifest XML");
            return null;
        }
    }

    private string GetCurrentVersion()
    {
        var version = Assembly.GetExecutingAssembly().GetName().Version;
        return version?.ToString() ?? "0.0.0.0";
    }

    private int CompareVersions(string current, string? available)
    {
        if (available == null)
            return -1;

        var currentParts = ParseVersion(current);
        var availableParts = ParseVersion(available);

        for (int i = 0; i < Math.Max(currentParts.Length, availableParts.Length); i++)
        {
            var currentPart = i < currentParts.Length ? currentParts[i] : 0;
            var availablePart = i < availableParts.Length ? availableParts[i] : 0;

            if (currentPart < availablePart)
                return -1;
            if (currentPart > availablePart)
                return 1;
        }

        return 0;
    }

    private int[] ParseVersion(string version)
    {
        try
        {
            var parts = Regex.Split(version, @"[^\d]+");
            var result = new System.Collections.Generic.List<int>();

            foreach (var part in parts)
            {
                if (int.TryParse(part, out var num))
                    result.Add(num);
            }

            return result.Count > 0 ? result.ToArray() : new[] { 0 };
        }
        catch
        {
            return new[] { 0 };
        }
    }

    public static string GetPendingUpdatePath()
    {
        var latestUpdate = Directory.GetFiles(UpdateDirectory, "SpendTracker.exe")
            .OrderByDescending(f => File.GetLastWriteTime(f))
            .FirstOrDefault();

        return latestUpdate ?? string.Empty;
    }
}
