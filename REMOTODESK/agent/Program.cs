using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Net.WebSockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace RemoteAgent
{
    class Program
    {
        private static ClientWebSocket _ws = new ClientWebSocket();
        private static string _roomId = "";
        private static string _serverUrl = "ws://localhost:3000/socket.io/?EIO=4&transport=websocket";

        // --- User32 Imports for Remote Control ---
        [DllImport("user32.dll")]
        static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);

        [DllImport("user32.dll")]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);

        [DllImport("user32.dll")]
        static extern bool SetCursorPos(int x, int y);

        private const int MOUSEEVENTF_LEFTDOWN = 0x02;
        private const int MOUSEEVENTF_LEFTUP = 0x04;
        private const int MOUSEEVENTF_RIGHTDOWN = 0x08;
        private const int MOUSEEVENTF_RIGHTUP = 0x10;

        static async Task Main(string[] args)
        {
            Console.Clear();
            Console.WriteLine("========================================");
            Console.WriteLine("    REMOTODESK WINDOWS AGENT v1.0       ");
            Console.WriteLine("========================================");
            
            try 
            {
                await ConnectToServer();
                
                // Screen streaming
                _ = Task.Run(async () => await StreamScreen());
                
                // Keep receiving commands
                await ReceiveCommands();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n[ERRO] {ex.Message}");
                Console.WriteLine("Tentando reconectar em 5 segundos...");
                await Task.Delay(5000);
                await Main(args);
            }
        }

        static async Task ConnectToServer()
        {
            Console.WriteLine("[INFO] Conectando ao servidor de sinalização...");
            if (_ws.State != WebSocketState.None) _ws = new ClientWebSocket();
            
            await _ws.ConnectAsync(new Uri(_serverUrl), CancellationToken.None);
            
            // Handshake Socket.io (Obrigatório)
            // 42["register-agent"]
            var regMsg = "42[\"register-agent\"]";
            await SendString(regMsg);
            Console.WriteLine("[OK] Agente registrado e aguardando conexão.");
        }

        static async Task SendString(string msg)
        {
            var bytes = Encoding.UTF8.GetBytes(msg);
            await _ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
        }

        static async Task StreamScreen()
        {
            while (_ws.State == WebSocketState.Open)
            {
                if (!string.IsNullOrEmpty(_roomId))
                {
                    byte[] screenBytes = CaptureScreen();
                    if (screenBytes != null)
                    {
                        // Socket.io binary wrap isn't simple with raw WS, 
                        // so we use the server's 'screen-data' event format if handled.
                        // For now, let's keep it simple as binary if the server expects it.
                        await _ws.SendAsync(new ArraySegment<byte>(screenBytes), WebSocketMessageType.Binary, true, CancellationToken.None);
                    }
                }
                await Task.Delay(100); // 10 FPS approx
            }
        }

        static byte[] CaptureScreen()
        {
            try 
            {
                Rectangle bounds = Screen.PrimaryScreen.Bounds;
                using (Bitmap bitmap = new Bitmap(bounds.Width, bounds.Height))
                {
                    using (Graphics g = Graphics.FromImage(bitmap))
                    {
                        g.CopyFromScreen(Point.Empty, Point.Empty, bounds.Size);
                    }
                    using (MemoryStream ms = new MemoryStream())
                    {
                        bitmap.Save(ms, ImageFormat.Jpeg);
                        return ms.ToArray();
                    }
                }
            }
            catch { return null; }
        }

        static async Task ReceiveCommands()
        {
            var buffer = new byte[1024 * 8];
            while (_ws.State == WebSocketState.Open)
            {
                var result = await _ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                var rawMsg = Encoding.UTF8.GetString(buffer, 0, result.Count);

                // Socket.io events look like: 42["event-name", {data}]
                if (rawMsg.StartsWith("42"))
                {
                    ProcessSocketMessage(rawMsg.Substring(2));
                }
            }
        }

        static void ProcessSocketMessage(string json)
        {
            try 
            {
                // Simple parser for demonstration (ideally use System.Text.Json)
                if (json.Contains("registered"))
                {
                    // Update Room ID from server response
                    // Example: ["registered", {"id":"123456"}]
                    int idIndex = json.IndexOf("\"id\":\"") + 6;
                    _roomId = json.Substring(idIndex, 6);
                    Console.WriteLine($"[INFO] Seu ID de acesso: {_roomId}");
                }
                else if (json.Contains("remote-mouse"))
                {
                    HandleMouseCommand(json);
                }
                else if (json.Contains("remote-keyboard"))
                {
                    HandleKeyboardCommand(json);
                }
            }
            catch (Exception ex) { Console.WriteLine($"Parse error: {ex.Message}"); }
        }

        static void HandleMouseCommand(string json)
        {
            // Extract x, y (0.0 to 1.0)
            // Use regex or specialized parser for production
            double x = ExtractDouble(json, "\"x\":");
            double y = ExtractDouble(json, "\"y\":");
            string type = ExtractString(json, "\"type\":\"");

            int screenX = (int)(x * Screen.PrimaryScreen.Bounds.Width);
            int screenY = (int)(y * Screen.PrimaryScreen.Bounds.Height);

            SetCursorPos(screenX, screenY);

            if (type == "mousedown") mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
            if (type == "mouseup") mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
        }

        static void HandleKeyboardCommand(string json)
        {
            try 
            {
                int keyCode = (int)ExtractDouble(json, "\"keyCode\":");
                string type = ExtractString(json, "\"type\":\"");
                
                uint flags = (type == "keyup") ? (uint)0x0002 : 0; // KEYEVENTF_KEYUP = 0x0002
                keybd_event((byte)keyCode, 0, flags, 0);
            }
            catch { }
        }

        static void LoadConfig()
        {
            try 
            {
                string configPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config.json");
                if (File.Exists(configPath))
                {
                    string json = File.ReadAllText(configPath);
                    _serverUrl = ExtractString(json, "\"serverUrl\":\"");
                    Console.WriteLine($"[CONFIG] Carregado: {_serverUrl}");
                }
            }
            catch { Console.WriteLine("[CONFIG] Erro ao carregar config.json. Usando padrão."); }
        }

        // Helper helpers
        static double ExtractDouble(string s, string key) {
            int start = s.IndexOf(key) + key.Length;
            int end = s.IndexOf(",", start);
            if (end == -1) end = s.IndexOf("}", start);
            return double.Parse(s.Substring(start, end - start).Replace(".", ","));
        }
        static string ExtractString(string s, string key) {
            int start = s.IndexOf(key) + key.Length;
            int end = s.IndexOf("\"", start);
            return s.Substring(start, end - start);
        }
    }
}

