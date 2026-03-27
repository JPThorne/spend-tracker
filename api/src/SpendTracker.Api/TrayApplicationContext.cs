using System.Windows.Forms;

namespace SpendTracker.Api;

public class TrayApplicationContext : ApplicationContext
{
    private readonly SystemTrayManager _trayManager;
    private readonly Task _webAppTask;

    public TrayApplicationContext(string appUrl, IHost webHost)
    {
        // Create the system tray manager
        _trayManager = new SystemTrayManager(appUrl, this);

        // Start the web application in the background
        _webAppTask = webHost.RunAsync();
    }

    public void Shutdown()
    {
        _trayManager.Dispose();
        ExitThread();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _trayManager?.Dispose();
        }
        base.Dispose(disposing);
    }
}
