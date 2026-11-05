using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

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

            ApplicationConfiguration.Initialize();
            Application.Run(new MainForm());
        }
    }

    public class MainForm : Form
    {
        private WebView2 webView;
        private Process? serverProcess;
        private int serverPort;

        public MainForm()
        {
            this.Text = "GymOS";
            this.Size = new Size(1280, 800);
            this.MinimumSize = new Size(1024, 600);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(5, 5, 5);

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string iconPath = Path.Combine(appDir, "icon.ico");
            if (File.Exists(iconPath))
            {
                try { this.Icon = new Icon(iconPath); } catch { }
            }

            webView = new WebView2
            {
                Dock = DockStyle.Fill
            };
            this.Controls.Add(webView);

            this.FormClosing += MainForm_FormClosing;
            this.Shown += MainForm_Shown;
        }

        private async void MainForm_Shown(object? sender, EventArgs e)
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string dataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "GymOS");
            string browserProfileDir = Path.Combine(dataDir, "browser-profile");

            if (!Directory.Exists(dataDir)) Directory.CreateDirectory(dataDir);
            if (!Directory.Exists(Path.Combine(dataDir, "uploads"))) Directory.CreateDirectory(Path.Combine(dataDir, "uploads"));
            if (!Directory.Exists(browserProfileDir)) Directory.CreateDirectory(browserProfileDir);

            serverPort = FindFreePort(3100);
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

            serverInfo.EnvironmentVariables["PORT"] = serverPort.ToString();
            serverInfo.EnvironmentVariables["HOST"] = "0.0.0.0";
            serverInfo.EnvironmentVariables["NODE_ENV"] = "production";
            serverInfo.EnvironmentVariables["GYMOS_DATA_PATH"] = dataDir;
            serverInfo.EnvironmentVariables["GYMOS_RESOURCES_PATH"] = Path.Combine(appDir, "resources");
            serverInfo.EnvironmentVariables["GYMOS_RELAY_URL"] = "https://gym-os-cam.vercel.app";
            serverInfo.EnvironmentVariables["GYMOS_SECRET_KEY"] = "b3aeda29734a19399f938b9512ec4bac58959595f37d94c1d6762774c98f891b";
            serverInfo.EnvironmentVariables["NITRO_PORT"] = serverPort.ToString();
            serverInfo.EnvironmentVariables["NITRO_HOST"] = "0.0.0.0";
            serverInfo.EnvironmentVariables["GYMOS_APP_VERSION"] = "1.0.17";

            try
            {
                serverProcess = Process.Start(serverInfo);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al iniciar el backend de GymOS: " + ex.Message, "GymOS", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Application.Exit();
                return;
            }

            bool serverReady = await Task.Run(() => WaitForServer(serverPort, 60));
            if (!serverReady)
            {
                try { serverProcess?.Kill(); } catch { }
                MessageBox.Show("Tiempo de espera agotado al conectar con el servidor local de GymOS.", "GymOS", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Application.Exit();
                return;
            }

            try
            {
                var env = await CoreWebView2Environment.CreateAsync(null, browserProfileDir);
                await webView.EnsureCoreWebView2Async(env);

                webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
                webView.CoreWebView2.Settings.IsZoomControlEnabled = false;

                webView.CoreWebView2.Navigate("http://127.0.0.1:" + serverPort);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al inicializar la vista web de GymOS: " + ex.Message, "GymOS", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void MainForm_FormClosing(object? sender, FormClosingEventArgs e)
        {
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
                    System.Threading.Thread.Sleep(250);
                }
            }
            return false;
        }
    }
}
