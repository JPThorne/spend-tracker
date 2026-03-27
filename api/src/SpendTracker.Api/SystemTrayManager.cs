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
    private bool _disposed;

    public SystemTrayManager(string appUrl, TrayApplicationContext context)
    {
        _appUrl = appUrl;
        _context = context;

        _notifyIcon = new NotifyIcon
        {
            // Use a simple built-in icon (we can create a custom one later)
            Icon = SystemIcons.Application,
            Visible = true,
            Text = "SpendTracker - Personal Finance Tracker"
        };

        // Create context menu
        var contextMenu = new ContextMenuStrip();
        
        var openItem = new ToolStripMenuItem("Open SpendTracker", null, OnOpen);
        openItem.Font = new Font(openItem.Font, FontStyle.Bold);
        contextMenu.Items.Add(openItem);
        
        contextMenu.Items.Add(new ToolStripSeparator());
        contextMenu.Items.Add(new ToolStripMenuItem("Exit", null, OnExit));

        _notifyIcon.ContextMenuStrip = contextMenu;
        
        // Double-click to open
        _notifyIcon.DoubleClick += (s, e) => OnOpen(s, e);

        // Show startup notification
        _notifyIcon.ShowBalloonTip(
            3000,
            "SpendTracker Running",
            "Click the icon to open the application",
            ToolTipIcon.Info
        );
    }

    private void OnOpen(object? sender, EventArgs e)
    {
        OpenBrowser(_appUrl);
    }

    private void OnExit(object? sender, EventArgs e)
    {
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
        catch
        {
            // Silently fail - user can still access via tray icon
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        
        _notifyIcon.Visible = false;
        _notifyIcon.Dispose();
        _disposed = true;
        
        GC.SuppressFinalize(this);
    }
}
