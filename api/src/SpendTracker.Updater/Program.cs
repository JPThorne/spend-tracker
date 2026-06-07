using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Windows.Forms;

namespace SpendTracker.Updater;

class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        try
        {
            if (args.Length < 2)
            {
                MessageBox.Show("Invalid updater invocation", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Environment.Exit(1);
            }

            var processId = int.Parse(args[0]);
            var newExePath = args[1];
            var currentExePath = args.Length > 2 ? args[2] : Process.GetCurrentProcess().MainModule?.FileName ?? "";

            if (!File.Exists(newExePath))
            {
                MessageBox.Show($"Update file not found: {newExePath}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Environment.Exit(1);
            }

            // Wait for the main process to exit (with timeout)
            var stopwatch = Stopwatch.StartNew();
            var timeout = TimeSpan.FromSeconds(30);

            while (stopwatch.Elapsed < timeout)
            {
                try
                {
                    Process.GetProcessById(processId);
                    Thread.Sleep(100);
                }
                catch (ArgumentException)
                {
                    // Process no longer exists
                    break;
                }
            }

            // Give the system a moment to fully release file locks
            Thread.Sleep(500);

            // Backup the old exe
            if (File.Exists(currentExePath))
            {
                var backupPath = currentExePath + ".bak";
                try
                {
                    if (File.Exists(backupPath))
                        File.Delete(backupPath);
                    File.Move(currentExePath, backupPath);
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Failed to backup current executable: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    Environment.Exit(1);
                }
            }

            // Replace with new exe
            try
            {
                File.Move(newExePath, currentExePath, overwrite: true);
            }
            catch (Exception ex)
            {
                // Try to restore from backup
                var backupPath = currentExePath + ".bak";
                if (File.Exists(backupPath))
                {
                    try
                    {
                        File.Move(backupPath, currentExePath, overwrite: true);
                    }
                    catch { }
                }

                MessageBox.Show($"Failed to apply update: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Environment.Exit(1);
            }

            // Launch the new version
            try
            {
                Process.Start(currentExePath);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to restart application: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Environment.Exit(1);
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Updater error: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Environment.Exit(1);
        }
    }
}
