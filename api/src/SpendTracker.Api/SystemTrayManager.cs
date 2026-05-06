using AutoUpdaterDotNET;
using Serilog;
using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace SpendTracker.Api;

public class SystemTrayManager : IDisposable
{
    private readonly NotifyIcon _notifyIcon;
    private readonly string _appUrl;
    private readonly TrayApplicationContext _context;
    private readonly UserPreferences _prefs;
    private readonly string _manifestUrl;
    private readonly System.Windows.Forms.Timer? _updateTimer;
    private bool _disposed;

    public SystemTrayManager(string appUrl, TrayApplicationContext context, UserPreferences prefs, string manifestUrl)
    {
        _appUrl = appUrl;
        _context = context;
        _prefs = prefs;
        _manifestUrl = manifestUrl;

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
            AutoUpdater.CheckForUpdateEvent += OnCheckForUpdate;
            _updateTimer = new System.Windows.Forms.Timer { Interval = 30_000 };
            _updateTimer.Tick += OnUpdateTimerTick;
            _updateTimer.Start();
        }

        Log.Information("Tray icon initialised. Auto-updates are {Status}", prefs.AutoUpdateEnabled ? "enabled" : "disabled");
    }

    private void OnCheckForUpdate(UpdateInfoEventArgs args)
    {
        if (args.Error != null)
        {
            Log.Error(args.Error, "Auto-update check failed (manifest: {ManifestUrl})", _manifestUrl);
            return;
        }

        if (args.IsUpdateAvailable)
            Log.Information("Update available: installed={Installed} available={Available} url={Url}",
                args.InstalledVersion, args.CurrentVersion, args.DownloadURL);
        else
            Log.Information("Auto-update check complete: already on latest version ({Version})", args.InstalledVersion);
    }

    private void OnUpdateTimerTick(object? sender, EventArgs e)
    {
        _updateTimer!.Interval = 3_600_000;
        if (_prefs.AutoUpdateEnabled)
        {
            Log.Information("Checking for updates at {ManifestUrl}", _manifestUrl);
            AutoUpdater.ReportErrors = false;
            AutoUpdater.Start(_manifestUrl);
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
