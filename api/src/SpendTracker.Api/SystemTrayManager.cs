using AutoUpdaterDotNET;
using Serilog;
using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Threading;
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
    private string? _pendingDownloadUrl;
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
            Log.Information("Auto-update check enabled. Manifest URL: {ManifestUrl}", _manifestUrl);

            AutoUpdater.AppTitle = "SpendTracker";
            AutoUpdater.ShowRemindLaterButton = false;
            AutoUpdater.ShowSkipButton = false;
            AutoUpdater.OpenDownloadPage = false;
            AutoUpdater.UpdateMode = Mode.ForcedDownload;
            AutoUpdater.TopMost = true;
            AutoUpdater.DownloadPath = Path.Combine(Path.GetTempPath(), "SpendTrackerUpdate");

            AutoUpdater.CheckForUpdateEvent += OnCheckForUpdate;
            AutoUpdater.ApplicationExitEvent += OnApplicationExit;
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

    private void OnCheckForUpdate(UpdateInfoEventArgs args)
    {
        if (args.Error != null)
        {
            Log.Error(args.Error, "Auto-update check failed (manifest: {ManifestUrl})", _manifestUrl);
            return;
        }

        if (args.IsUpdateAvailable)
        {
            Log.Information("Update available: installed={Installed} available={Available} url={Url}",
                args.InstalledVersion, args.CurrentVersion, args.DownloadURL);
            _pendingDownloadUrl = args.DownloadURL;

            if (_prefs.AutoUpdateEnabled)
            {
                var updateThread = new Thread(() =>
                {
                    try
                    {
                        Log.Information("Showing auto-update UI for available update");
                        AutoUpdater.ShowUpdateForm(args);
                    }
                    catch (Exception ex)
                    {
                        Log.Error(ex, "Failed to show update form for {Url}", args.DownloadURL);
                    }
                })
                {
                    IsBackground = true
                };
                updateThread.SetApartmentState(ApartmentState.STA);
                updateThread.Start();
            }
            else
            {
                Log.Information("Auto-update available but disabled in preferences");
            }
        }
        else
            Log.Information("Auto-update check complete: already on latest version ({Version})", args.InstalledVersion);
    }

    private void OnApplicationExit()
    {
        if (_pendingDownloadUrl == null) { Environment.Exit(0); return; }

        var fileName = Path.GetFileName(new Uri(_pendingDownloadUrl).LocalPath);
        var downloadedPath = Path.Combine(AutoUpdater.DownloadPath, fileName);
        var currentExe = Process.GetCurrentProcess().MainModule?.FileName;

        if (!File.Exists(downloadedPath) || string.IsNullOrEmpty(currentExe))
        {
            Log.Warning("Cannot self-replace: downloadedPath={D} currentExe={E}", downloadedPath, currentExe);
            Environment.Exit(0);
            return;
        }

        var pid = Process.GetCurrentProcess().Id;
        var script = Path.Combine(Path.GetTempPath(), "spendtracker_update.bat");

        File.WriteAllText(script, $"""
            @echo off
            :wait
            tasklist /FI "PID eq {pid}" 2>NUL | findstr /I "{pid}" >NUL
            if not ERRORLEVEL 1 (
                timeout /t 1 /nobreak >NUL
                goto wait
            )
            copy /Y "{downloadedPath}" "{currentExe}"
            start "" "{currentExe}"
            del "%~f0"
            """);

        Process.Start(new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = $"/c \"{script}\"",
            CreateNoWindow = true,
            UseShellExecute = false
        });

        Log.Information("Update replacement script launched; exiting");
        Log.CloseAndFlush();
        Environment.Exit(0);
    }

    private void OnUpdateTimerTick(object? sender, EventArgs e)
    {
        _updateTimer!.Interval = 3_600_000;
        Log.Information("Update timer tick fired. AutoUpdateEnabled={AutoUpdateEnabled}", _prefs.AutoUpdateEnabled);
        if (_prefs.AutoUpdateEnabled)
        {
            try
            {
                Log.Information("Checking for updates at {ManifestUrl}", _manifestUrl);
                AutoUpdater.ReportErrors = false;
                AutoUpdater.Start(_manifestUrl);
                Log.Information("AutoUpdater.Start() called successfully");
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Exception occurred in AutoUpdater.Start()");
            }
        }
        else
        {
            Log.Information("Update check skipped: AutoUpdateEnabled is false");
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
        AutoUpdater.CheckForUpdateEvent -= OnCheckForUpdate;
        AutoUpdater.ApplicationExitEvent -= OnApplicationExit;
        _notifyIcon.Visible = false;
        _notifyIcon.Dispose();
        _disposed = true;

        GC.SuppressFinalize(this);
    }
}
