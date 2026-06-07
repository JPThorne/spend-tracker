using System.Windows.Forms;
using SpendTracker.Api.Services;

namespace SpendTracker.Api;

public class TrayApplicationContext : ApplicationContext
{
    private readonly SystemTrayManager _trayManager;
    private readonly Task _webAppTask;

    public TrayApplicationContext(string appUrl, IHost webHost, UserPreferences prefs, string manifestUrl, IUpdateChecker updateChecker)
    {
        _trayManager = new SystemTrayManager(appUrl, this, prefs, manifestUrl, updateChecker);
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
