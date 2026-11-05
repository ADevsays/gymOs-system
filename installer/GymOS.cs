using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace GymOS
{
    static class Program
    {
        [DllImport("shell32.dll", SetLastError = true)]
        private static extern void SetCurrentProcessExplicitAppUserModelID([MarshalAs(UnmanagedType.LPWStr)] string AppID);

        [STAThread]
        static void Main()
        {
            try
            {
                SetCurrentProcessExplicitAppUserModelID("GymOS.App");
            }
            catch { }

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string dataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "GymOS");
            string browserProfileDir = Path.Combine(dataDir, "browser-profile");

            if (!Directory.Exists(dataDir)) Directory.CreateDirectory(dataDir);
            if (!Directory.Exists(Path.Combine(dataDir, "uploads"))) Directory.CreateDirectory(Path.Combine(dataDir, "uploads"));
            if (!Directory.Exists(browserProfileDir)) Directory.CreateDirectory(browserProfileDir);

            int port = FindFreePort(3100);
            string nodePath = Path.Combine(appDir, "node.exe");
            string serverEntry = Path.Combine(appDir, "server", "index.mjs");

            ProcessStartInfo serverInfo = new ProcessStartInfo
            {
                FileName = nodePath,
                Arguments = "\"" + serverEntry + "\"",
                WorkingDirectory = appDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };

            serverInfo.EnvironmentVariables["PORT"] = port.ToString();
            serverInfo.EnvironmentVariables["HOST"] = "0.0.0.0";
            serverInfo.EnvironmentVariables["NODE_ENV"] = "production";
            serverInfo.EnvironmentVariables["GYMOS_DATA_PATH"] = dataDir;
            serverInfo.EnvironmentVariables["GYMOS_RESOURCES_PATH"] = Path.Combine(appDir, "resources");
            serverInfo.EnvironmentVariables["NITRO_PORT"] = port.ToString();
            serverInfo.EnvironmentVariables["NITRO_HOST"] = "0.0.0.0";

            Process serverProcess = null;
            try
            {
                serverProcess = Process.Start(serverInfo);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al iniciar el servidor GymOS: " + ex.Message, "GymOS", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            if (!WaitForServer(port, 60))
            {
                try { serverProcess.Kill(); } catch { }
                MessageBox.Show("Tiempo de espera agotado al conectar con el servidor local de GymOS.", "GymOS", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            string browser = FindBrowser();
            string url = "http://127.0.0.1:" + port;

            if (!string.IsNullOrEmpty(browser))
            {
                string args = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1280,800 --disable-extensions --no-first-run --no-default-browser-check --app-id=GymOS.App", url, browserProfileDir);
                ProcessStartInfo browserInfo = new ProcessStartInfo
                {
                    FileName = browser,
                    Arguments = args,
                    UseShellExecute = false
                };

                Process browserProcess = Process.Start(browserInfo);

                while (!serverProcess.HasExited && (browserProcess == null || !browserProcess.HasExited))
                {
                    Thread.Sleep(500);
                }
            }
            else
            {
                Process.Start(url);
                while (!serverProcess.HasExited)
                {
                    Thread.Sleep(1000);
                }
            }

            try
            {
                if (serverProcess != null && !serverProcess.HasExited)
                {
                    serverProcess.Kill();
                }
            }
            catch { }
        }

        private static int FindFreePort(int startPort)
        {
            int port = startPort;
            while (port < 65535)
            {
                try
                {
                    TcpListener l = new TcpListener(IPAddress.Any, port);
                    l.Start();
                    l.Stop();
                    return port;
                }
                catch
                {
                    port++;
                }
            }
            return startPort;
        }

        private static bool WaitForServer(int port, int maxAttempts)
        {
            string url = "http://127.0.0.1:" + port + "/api/health";
            for (int i = 0; i < maxAttempts; i++)
            {
                try
                {
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                    req.Timeout = 500;
                    using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                    {
                        if (resp.StatusCode == HttpStatusCode.OK) return true;
                    }
                }
                catch
                {
                    Thread.Sleep(250);
                }
            }
            return false;
        }

        private static string FindBrowser()
        {
            string progFiles86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            string progFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

            string[] candidates = new string[]
            {
                Path.Combine(progFiles86, "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(progFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(localAppData, "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(progFiles86, "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(progFiles, "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(localAppData, "Google", "Chrome", "Application", "chrome.exe")
            };

            foreach (string p in candidates)
            {
                if (File.Exists(p)) return p;
            }
            return null;
        }
    }
}
