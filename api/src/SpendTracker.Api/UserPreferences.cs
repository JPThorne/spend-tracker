using System.Text.Json;

namespace SpendTracker.Api;

public class UserPreferences
{
    private static readonly string PrefsPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "SpendTracker", "prefs.json");

    public bool AutoUpdateEnabled { get; set; } = true;

    public static UserPreferences Load()
    {
        try
        {
            if (File.Exists(PrefsPath))
            {
                var prefs = JsonSerializer.Deserialize<UserPreferences>(File.ReadAllText(PrefsPath)) ?? new();
                Serilog.Log.Information("User preferences loaded from {Path}. AutoUpdateEnabled={AutoUpdateEnabled}", PrefsPath, prefs.AutoUpdateEnabled);
                return prefs;
            }
            else
            {
                Serilog.Log.Information("User preferences file not found at {Path}. Using defaults (AutoUpdateEnabled=true)", PrefsPath);
                return new();
            }
        }
        catch (Exception ex)
        {
            Serilog.Log.Error(ex, "Error loading user preferences from {Path}. Using defaults", PrefsPath);
        }
        return new();
    }

    public void Save()
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(PrefsPath)!);
            File.WriteAllText(PrefsPath, JsonSerializer.Serialize(this, new JsonSerializerOptions { WriteIndented = true }));
        }
        catch { }
    }
}
