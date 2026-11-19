#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Shalom Kerala Stores — High-Performance Local HTTP Server & Multi-Device Host
Enables PWA installation, Service Worker offline caching, camera barcode scanning,
and multi-device Wi-Fi access (Cashier Desktop + Staff Phone Barcode Scanner).
"""

import http.server
import socket
import socketserver
import os
import sys
import webbrowser
import json
import urllib.parse

DEFAULT_PORT = 8085
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def get_lan_ip():
    """Detect LAN IP for phone & tablet access on local Wi-Fi"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"

class ShalomHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def guess_type(self, path):
        mimetype = super().guess_type(path)
        if path.endswith('.js'):
            return 'application/javascript; charset=utf-8'
        elif path.endswith('.css'):
            return 'text/css; charset=utf-8'
        elif path.endswith('.json') or path.endswith('.webmanifest'):
            return 'application/json; charset=utf-8'
        elif path.endswith('.svg'):
            return 'image/svg+xml'
        return mimetype

    def end_headers(self):
        # Allow cross-origin and multi-device LAN access
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Health check
        if self.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "healthy",
                "app": "Shalom Kerala Stores",
                "store": "Gorakhpur, UP",
                "upi": "7379325499@ybl"
            }).encode('utf-8'))
            return

        # Redirect root to index.html
        if self.path == '/' or self.path == '':
            self.send_response(302)
            self.send_header('Location', '/index.html')
            self.end_headers()
            return

        super().do_GET()

    def do_POST(self):
        if self.path == '/api/backup_stock':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                data = json.loads(body)
                backup_path = os.path.join(DIRECTORY, 'stock_live_backup.json')
                with open(backup_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Stock backup saved"}).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
                return

        super().do_POST()

def start_server(port=DEFAULT_PORT, open_browser=True):
    os.chdir(DIRECTORY)
    lan_ip = get_lan_ip()

    # Find free port if 8085 is taken
    current_port = port
    server = None
    for attempt in range(10):
        try:
            server = socketserver.ThreadingTCPServer(("", current_port), ShalomHTTPHandler)
            server.allow_reuse_address = True
            break
        except OSError:
            current_port += 1

    if not server:
        print(f"❌ Error: Unable to bind to ports {port} through {current_port}")
        sys.exit(1)

    local_url = f"http://localhost:{current_port}"
    lan_url = f"http://{lan_ip}:{current_port}"

    print("=" * 68)
    print("🌴 SHALOM KERALA STORES — RETAIL POS & STOREFRONT ENGINE")
    print("   Location: Gorakhpur, Uttar Pradesh | UPI: 7379325499@ybl")
    print("=" * 68)
    print(f"✅ Local Server Running:     {local_url}")
    print(f"📱 Phone & Wi-Fi Access:     {lan_url}")
    print("-" * 68)
    print(f"🛒 Public E-Commerce Store:  {local_url}/index.html")
    print(f"🧾 POS Billing Counter:      {local_url}/billing.html")
    print(f"📦 Inventory & Stock ERP:    {local_url}/inventory.html")
    print(f"📊 Executive Dashboard:      {local_url}/dashboard.html")
    print("=" * 68)
    print("💡 TIP: Open the phone URL on any Android/iPhone on the store Wi-Fi")
    print("        to use your phone camera as a high-speed wireless barcode scanner!")
    print("        Press Ctrl+C to stop server.\n")

    if open_browser:
        try:
            webbrowser.open(f"{local_url}/index.html")
        except Exception:
            pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Shalom server stopped gracefully.")
        server.server_close()

if __name__ == "__main__":
    port_arg = DEFAULT_PORT
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port_arg = int(sys.argv[1])
    open_b = "--no-browser" not in sys.argv
    start_server(port=port_arg, open_browser=open_b)
