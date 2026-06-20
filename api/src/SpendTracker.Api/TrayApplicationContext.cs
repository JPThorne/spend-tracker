using System.Windows.Forms;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace SpendTracker.Api;

public class TrayApplicationContext : ApplicationContext
{
    private readonly SystemTrayManager _trayManager;
    private readonly Task _webAppTask;

    public TrayApplicationContext(string appUrl, IHost webHost, UserPreferences prefs)
    {
        _trayManager = new SystemTrayManager(appUrl, this, prefs);
        _webAppTask = webHost.RunAsync();

        webHost.Services.GetRequiredService<IHostApplicationLifetime>()
            .ApplicationStarted.Register(() => _trayManager.OpenOnStartup());
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
