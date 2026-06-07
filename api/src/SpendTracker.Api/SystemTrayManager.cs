using Serilog;
using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Velopack;
using Velopack.Sources;

namespace SpendTracker.Api;

public class SystemTrayManager : IDisposable
{
    private readonly NotifyIcon _notifyIcon;
    private readonly string _appUrl;
    private readonly TrayApplicationContext _context;
    private readonly UserPreferences _prefs;
    private readonly System.Windows.Forms.Timer _updateTimer;
    private UpdateInfo? _pendingUpdate;
    private bool _disposed;

    private const string GithubRepoUrl = "https://github.com/JPThorne/spend-tracker";

    public SystemTrayManager(string appUrl, TrayApplicationContext context, UserPreferences prefs)
    {
        _appUrl = appUrl;
        _context = context;
        _prefs = prefs;

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

        _updateTimer = new System.Windows.Forms.Timer { Interval = 30_000 };
        _updateTimer.Tick += OnUpdateTimerTick;
        _updateTimer.Start();
        Log.Information("Update timer started. First check in 30 seconds, then every 1 hour");
    }

    private async void OnUpdateTimerTick(object? sender, EventArgs e)
    {
        _updateTimer.Interval = 3_600_000;

        if (!_prefs.AutoUpdateEnabled)
            return;

        await CheckAndDownloadUpdateAsync();
    }

    private async Task CheckAndDownloadUpdateAsync()
    {
        try
        {
            var mgr = new UpdateManager(new GithubSource(GithubRepoUrl, null, false));

            if (!mgr.IsInstalled)
                return;

            var newVersion = await mgr.CheckForUpdatesAsync();
            if (newVersion == null)
            {
                Log.Information("No update available");
                return;
            }

            _pendingUpdate = newVersion;
            Log.Information("Update {Version} available. Downloading silently.", newVersion.TargetFullRelease.Version);
            await mgr.DownloadUpdatesAsync(newVersion);
            Log.Information("Update downloaded. Will apply on next restart.");

            _notifyIcon.ShowBalloonTip(
                5000,
                "SpendTracker Update Ready",
                $"Version {newVersion.TargetFullRelease.Version} will be applied on next launch.",
                ToolTipIcon.Info
            );
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "Background update check failed");
        }
    }

    private void OnOpen(object? sender, EventArgs e) => OpenBrowser(_appUrl);

    private void OnExit(object? sender, EventArgs e)
    {
        Log.Information("Exit requested via tray menu");
        _notifyIcon.Visible = false;

        if (_pendingUpdate != null)
        {
            try
            {
                var mgr = new UpdateManager(new GithubSource(GithubRepoUrl, null, false));
                mgr.WaitExitThenApplyUpdates(_pendingUpdate);
                Log.Information("Pending update scheduled to apply after process exits");
            }
            catch (Exception ex)
            {
                Log.Warning(ex, "Failed to schedule pending update on exit");
            }
        }

        _context.Shutdown();
    }

    private static void OpenBrowser(string url)
    {
        try
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            else if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
                Process.Start("xdg-open", url);
            else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
                Process.Start("open", url);
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
        _updateTimer.Stop();
        _updateTimer.Dispose();
        _notifyIcon.Visible = false;
        _notifyIcon.Dispose();
        _disposed = true;

        GC.SuppressFinalize(this);
    }
}
