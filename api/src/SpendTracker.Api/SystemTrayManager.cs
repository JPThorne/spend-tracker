using Serilog;
using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using SpendTracker.Api.Services;

namespace SpendTracker.Api;

public class SystemTrayManager : IDisposable
{
    private readonly NotifyIcon _notifyIcon;
    private readonly string _appUrl;
    private readonly TrayApplicationContext _context;
    private readonly UserPreferences _prefs;
    private readonly string _manifestUrl;
    private readonly IUpdateChecker _updateChecker;
    private readonly System.Windows.Forms.Timer? _updateTimer;
    private UpdateInfo? _pendingUpdate;
    private bool _disposed;

    public SystemTrayManager(string appUrl, TrayApplicationContext context, UserPreferences prefs, string manifestUrl, IUpdateChecker updateChecker)
    {
        _appUrl = appUrl;
        _context = context;
        _prefs = prefs;
        _manifestUrl = manifestUrl;
        _updateChecker = updateChecker;

        _notifyIcon = new NotifyIcon
        {
            Icon = SystemIcons.Application,
            Visible = true,
            Text = "SpendTracker - Personal Finance Tracker"
        };

        var contextMenu = new ContextMenuStrip();

        var openItem = new ToolStripMenuItem("Open SpendTracker", null, OnOpen);
        openItem.Font = new Font(openItem.Font, FontStyle.Bold);
        contextMenu.Items.Add(openItem);

        contextMenu.Items.Add(new ToolStripSeparator());

        var autoUpdateItem = new ToolStripMenuItem("Auto-Updates")
        {
            Checked = _prefs.AutoUpdateEnabled,
            CheckOnClick = true
        };
        autoUpdateItem.Click += (s, e) =>
        {
            _prefs.AutoUpdateEnabled = autoUpdateItem.Checked;
            _prefs.Save();
            Log.Information("Auto-updates {Status}", autoUpdateItem.Checked ? "enabled" : "disabled");
        };
        contextMenu.Items.Add(autoUpdateItem);

        contextMenu.Items.Add(new ToolStripSeparator());
        contextMenu.Items.Add(new ToolStripMenuItem("Exit", null, OnExit));

        _notifyIcon.ContextMenuStrip = contextMenu;
        _notifyIcon.DoubleClick += (s, e) => OnOpen(s, e);

        _notifyIcon.ShowBalloonTip(
            3000,
            "SpendTracker Running",
            "Click the icon to open the application",
            ToolTipIcon.Info
        );

        if (!string.IsNullOrEmpty(_manifestUrl))
        {
            Log.Information("Auto-update check enabled. Manifest URL: {ManifestUrl}", _manifestUrl);

            // Check for pending update from previous session
            CheckForPendingUpdate();

            _updateTimer = new System.Windows.Forms.Timer { Interval = 30_000 };
            _updateTimer.Tick += OnUpdateTimerTick;
            _updateTimer.Start();
            Log.Information("Update timer started. First check in 30 seconds, then every 1 hour");
        }
        else
        {
            Log.Warning("Auto-update check DISABLED: manifest URL is empty or null");
        }

        Log.Information("Tray icon initialised. Auto-updates preference: {Status}", prefs.AutoUpdateEnabled ? "enabled" : "disabled");
    }

    private void CheckForPendingUpdate()
    {
        try
        {
            var pendingUpdatePath = UpdateChecker.GetPendingUpdatePath();
            if (!string.IsNullOrEmpty(pendingUpdatePath) && File.Exists(pendingUpdatePath))
            {
                Log.Information("Pending update found: {Path}", pendingUpdatePath);

                if (_prefs.AutoUpdateEnabled)
                {
                    ApplyUpdate(pendingUpdatePath);
                }
                else
                {
                    _notifyIcon.ShowBalloonTip(
                        5000,
                        "Update Ready",
                        "An update is ready to install. Restart the application to apply it.",
                        ToolTipIcon.Info
                    );
                }
            }
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Error checking for pending update");
        }
    }

    private async void OnUpdateTimerTick(object? sender, EventArgs e)
    {
        _updateTimer!.Interval = 3_600_000; // 1 hour
        Log.Information("Update timer tick. AutoUpdateEnabled={AutoUpdateEnabled}", _prefs.AutoUpdateEnabled);

        if (!_prefs.AutoUpdateEnabled)
        {
            Log.Information("Update check skipped: AutoUpdateEnabled is false");
            return;
        }

        try
        {
            Log.Information("Checking for updates at {ManifestUrl}", _manifestUrl);
            var updateInfo = await _updateChecker.CheckForUpdatesAsync(_manifestUrl);

            if (updateInfo?.IsUpdateAvailable == true)
            {
                _pendingUpdate = updateInfo;
                Log.Information("Update available: {Version} at {Url}", updateInfo.Version, updateInfo.DownloadUrl);

                ShowUpdateDialog(updateInfo);
            }
            else
            {
                Log.Information("No update available");
            }
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Error checking for updates");
        }
    }

    private void ShowUpdateDialog(UpdateInfo updateInfo)
    {
        var result = MessageBox.Show(
            $"SpendTracker {updateInfo.Version} is available.\n\nWould you like to download and install it?",
            "Update Available",
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Information
        );

        if (result == DialogResult.Yes)
        {
            DownloadAndApplyUpdate(updateInfo);
        }
    }

    private async void DownloadAndApplyUpdate(UpdateInfo updateInfo)
    {
        try
        {
            if (string.IsNullOrEmpty(updateInfo.DownloadUrl))
            {
                Log.Error("Update has no download URL");
                MessageBox.Show("Error: No download URL provided", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            var fileName = Path.GetFileName(new Uri(updateInfo.DownloadUrl).LocalPath);
            Log.Information("Starting download of {FileName} from {Url}", fileName, updateInfo.DownloadUrl);

            var success = await _updateChecker.DownloadUpdateAsync(updateInfo.DownloadUrl, fileName);

            if (success)
            {
                _notifyIcon.ShowBalloonTip(
                    3000,
                    "Update Ready",
                    "Update downloaded. Restart the application to apply it.",
                    ToolTipIcon.Info
                );
                Log.Information("Update downloaded successfully. Will be applied on next restart.");
            }
            else
            {
                Log.Warning("Failed to download update");
                MessageBox.Show(
                    "Failed to download the update. Please try again later.",
                    "Download Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Error downloading update");
            MessageBox.Show(
                $"Error downloading update: {ex.Message}",
                "Download Error",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
        }
    }

    private void ApplyUpdate(string updatePath)
    {
        try
        {
            var currentExePath = Process.GetCurrentProcess().MainModule?.FileName;
            if (string.IsNullOrEmpty(currentExePath))
            {
                Log.Error("Cannot determine current executable path");
                return;
            }

            var updaterExePath = Path.Combine(Path.GetDirectoryName(currentExePath) ?? "", "SpendTrackerUpdater.exe");

            // If updater is not in the same directory, look in bin directory
            if (!File.Exists(updaterExePath))
            {
                var binPath = AppContext.BaseDirectory;
                updaterExePath = Path.Combine(binPath, "SpendTrackerUpdater.exe");
            }

            if (!File.Exists(updaterExePath))
            {
                Log.Warning("Updater tool not found at {Path}. Update will be applied on manual restart.", updaterExePath);
                return;
            }

            var currentProcessId = Process.GetCurrentProcess().Id;
            Log.Information("Launching updater: {UpdaterPath} with args: {PID} {UpdatePath} {CurrentExe}",
                updaterExePath, currentProcessId, updatePath, currentExePath);

            Process.Start(new ProcessStartInfo
            {
                FileName = updaterExePath,
                Arguments = $"{currentProcessId} \"{updatePath}\" \"{currentExePath}\"",
                UseShellExecute = false,
                CreateNoWindow = true
            });

            Log.Information("Updater launched, exiting to allow replacement");
            Log.CloseAndFlush();
            Environment.Exit(0);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Error applying update");
        }
    }

    private void OnOpen(object? sender, EventArgs e)
    {
        OpenBrowser(_appUrl);
    }

    private void OnExit(object? sender, EventArgs e)
    {
        Log.Information("Exit requested via tray menu");
        _notifyIcon.Visible = false;
        _context.Shutdown();
    }

    private static void OpenBrowser(string url)
    {
        try
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            else if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            {
                Process.Start("xdg-open", url);
            }
            else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            {
                Process.Start("open", url);
            }
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "Failed to open browser at {Url}", url);
        }
    }

    public void Dispose()
    {
        if (_disposed) return;

        Log.Information("SpendTracker tray shutting down");
        _updateTimer?.Stop();
        _updateTimer?.Dispose();
        _notifyIcon.Visible = false;
        _notifyIcon.Dispose();
        _disposed = true;

        GC.SuppressFinalize(this);
    }
}
