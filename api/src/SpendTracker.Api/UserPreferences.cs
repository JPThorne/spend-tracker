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
                return JsonSerializer.Deserialize<UserPreferences>(File.ReadAllText(PrefsPath)) ?? new();
        }
        catch { }
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
