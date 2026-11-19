#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Shalom Kerala Stores — High-Performance Local HTTP Server & Multi-Device Host
Enables PWA installation, Service Worker offline caching, camera barcode scanning,
and WhatsApp Inbound "Click-to-Verify" Webhook (Reverse Verification Flow).
"""

import http.server
import socket
import socketserver
import os
import sys
import webbrowser
import json
import urllib.parse
import urllib.request
import re
import time
import threading
from datetime import datetime, timezone

DEFAULT_PORT = 8085
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# WhatsApp Inbound Reverse Verification Configuration
WHATSAPP_CONFIG = {
    "business_number": "917379325499",
    "display_phone": "+91 73793 25499",
    "verify_token": os.environ.get("WHATSAPP_VERIFY_TOKEN", "shalom_wa_verify_token_2026"),
    "api_token": os.environ.get("WHATSAPP_API_TOKEN", ""),
    "phone_number_id": os.environ.get("WHATSAPP_PHONE_NUMBER_ID", ""),
    "firebase_rtdb_url": "https://adonaibroadcast-11095.firebaseio.com"
}

# In-memory store for active verification sessions: sessionId -> dict
wa_sessions_lock = threading.Lock()
wa_sessions = {}

def sync_session_to_firebase(session_id, data):
    """Dual-sync session update directly to Firebase RTDB via REST API"""
    try:
        url = f"{WHATSAPP_CONFIG['firebase_rtdb_url']}/wa_verifications/{session_id}.json"
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='PATCH'
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            pass
    except Exception as e:
        # Non-fatal if offline or rules require auth
        pass

def send_whatsapp_reply(recipient_phone, text_body):
    """Optional: reply back to user via Meta WhatsApp Cloud API (free under user-initiated window)"""
    token = WHATSAPP_CONFIG["api_token"]
    phone_id = WHATSAPP_CONFIG["phone_number_id"]
    if not token or not phone_id:
        return False
    try:
        url = f"https://graph.facebook.com/v19.0/{phone_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": recipient_phone,
            "type": "text",
            "text": { "body": text_body }
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            },
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=4) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        print(f"[WhatsApp API] Auto-reply error: {e}")
        return False

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
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE, PATCH")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Health check
        if path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "healthy",
                "app": "Shalom Kerala Stores",
                "store": "Gorakhpur, UP",
                "upi": "7379325499@ybl",
                "whatsapp_business": WHATSAPP_CONFIG["business_number"]
            }).encode('utf-8'))
            return

        # Redirect root to index.html
        if path == '/' or path == '':
            self.send_response(302)
            self.send_header('Location', '/index.html')
            self.end_headers()
            return

        # =====================================================================
        # WhatsApp Webhook Handshake (Meta Cloud API verification)
        # =====================================================================
        if path == '/webhook/whatsapp':
            hub_mode = query.get('hub.mode', [None])[0]
            hub_challenge = query.get('hub.challenge', [None])[0]
            hub_verify_token = query.get('hub.verify_token', [None])[0]

            expected_token = WHATSAPP_CONFIG["verify_token"]

            if hub_mode == 'subscribe' and hub_verify_token == expected_token:
                print(f"[WhatsApp Webhook] ✅ Handshake verified by Meta with token '{expected_token}'")
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                self.wfile.write((hub_challenge or '').encode('utf-8'))
                return
            elif hub_mode:
                print(f"[WhatsApp Webhook] ❌ Verification failed: received token '{hub_verify_token}', expected '{expected_token}'")
                self.send_response(403)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Verification token mismatch"}).encode('utf-8'))
                return
            else:
                # Browser visit: show status & documentation
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "active",
                    "service": "Shalom WhatsApp Inbound Verification Webhook",
                    "business_number": WHATSAPP_CONFIG["business_number"],
                    "verify_token": expected_token,
                    "instructions": "Point Meta WhatsApp Cloud API Callback URL to: https://YOUR_DOMAIN/webhook/whatsapp"
                }, indent=2).encode('utf-8'))
                return

        # =====================================================================
        # API: Check Session Status
        # =====================================================================
        if path == '/api/whatsapp/status':
            session_id = query.get('sessionId', [None])[0]
            if not session_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "sessionId query parameter required"}).encode('utf-8'))
                return

            with wa_sessions_lock:
                session = wa_sessions.get(session_id)
                if session:
                    # Check expiry only for pending sessions with valid expiresAt
                    if session.get('status') == 'pending' and session.get('expiresAt'):
                        if time.time() * 1000 > session['expiresAt']:
                            session['status'] = 'expired'
                    res_data = {
                        "sessionId": session_id,
                        "status": session.get("status", "pending"),
                        "phone": session.get("phone"),
                        "name": session.get("name"),
                        "verifiedAt": session.get("verifiedAt")
                    }
                else:
                    res_data = {"sessionId": session_id, "status": "pending"}

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(res_data).encode('utf-8'))
            return

        # =====================================================================
        # API: List Active Sessions (Admin / Debug)
        # =====================================================================
        if path == '/api/whatsapp/sessions':
            with wa_sessions_lock:
                now_ms = time.time() * 1000
                active_list = [
                    v for v in wa_sessions.values()
                    if (now_ms - v.get('createdAt', 0)) < 600000
                ]
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "count": len(active_list),
                "sessions": active_list
            }, indent=2).encode('utf-8'))
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # Backup stock
        if path == '/api/backup_stock':
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

        # =====================================================================
        # WhatsApp Inbound Message Webhook (Meta Cloud API POST)
        # =====================================================================
        if path == '/webhook/whatsapp':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'
                data = json.loads(body)

                # Acknowledge Meta immediately with 200 OK
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))

                # Parse Meta WhatsApp Cloud API incoming payload
                entries = data.get("entry", [])
                for entry in entries:
                    for change in entry.get("changes", []):
                        val = change.get("value", {})
                        messages = val.get("messages", [])
                        for msg in messages:
                            if msg.get("type") != "text":
                                continue
                            sender_phone = str(msg.get("from", "")).replace("+", "").strip()
                            text_body = msg.get("text", {}).get("body", "").strip()
                            print(f"[WhatsApp Webhook] 📩 Incoming message from +{sender_phone}: '{text_body}'")

                            # Extract 6-digit code
                            match = re.search(r'(?:Verify (?:Login )?Code:\s*|Code:\s*)?(\d{6})', text_body, re.IGNORECASE)
                            if not match:
                                continue

                            received_code = match.group(1)
                            print(f"[WhatsApp Webhook] Extracted code: {received_code} from +{sender_phone}")

                            # Find matching pending session
                            matched_session_id = None
                            with wa_sessions_lock:
                                for sid, sess in wa_sessions.items():
                                    if sess.get("code") == received_code and sess.get("status") == "pending":
                                        sess["status"] = "verified"
                                        sess["phone"] = sender_phone
                                        sess["verifiedAt"] = datetime.now(timezone.utc).isoformat()
                                        matched_session_id = sid
                                        print(f"[WhatsApp Webhook] 🎉 Successfully matched & verified session: {sid}")
                                        break

                            # If session matched, sync to Firebase RTDB and send auto-reply
                            if matched_session_id:
                                update_payload = {
                                    "status": "verified",
                                    "phone": sender_phone,
                                    "verifiedAt": datetime.now(timezone.utc).isoformat()
                                }
                                sync_session_to_firebase(matched_session_id, update_payload)

                                # Optional auto-reply
                                send_whatsapp_reply(
                                    sender_phone,
                                    "🌴 Shalom Kerala Stores: Your login code has been verified successfully! You may now return to the app."
                                )
                return
            except Exception as e:
                print(f"[WhatsApp Webhook] Error processing incoming webhook: {e}")
                return

        # =====================================================================
        # API: Register Pending Session from Frontend
        # =====================================================================
        if path == '/api/whatsapp/register_session':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                data = json.loads(body)
                session_id = data.get("sessionId")
                if not session_id or not data.get("code"):
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Missing sessionId or code"}).encode('utf-8'))
                    return

                with wa_sessions_lock:
                    wa_sessions[session_id] = {
                        "sessionId": session_id,
                        "code": str(data.get("code")),
                        "status": "pending",
                        "phone": data.get("phone"),
                        "name": data.get("name", ""),
                        "createdAt": data.get("createdAt", int(time.time() * 1000)),
                        "expiresAt": data.get("expiresAt", int(time.time() * 1000) + 300000)
                    }

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "sessionId": session_id}).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
                return

        # =====================================================================
        # API: Simulate Inbound Verification (Instant Test / Demo)
        # =====================================================================
        if path == '/api/whatsapp/simulate':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'
                data = json.loads(body)
                target_code = str(data.get("code", "")).strip()
                target_session_id = data.get("sessionId")
                sender_phone = str(data.get("phone", "917379325499")).replace("+", "").strip()

                verified_sid = None
                with wa_sessions_lock:
                    if target_session_id and target_session_id in wa_sessions:
                        sess = wa_sessions[target_session_id]
                        sess["status"] = "verified"
                        sess["phone"] = sender_phone
                        sess["verifiedAt"] = datetime.now(timezone.utc).isoformat()
                        verified_sid = target_session_id
                    elif target_code:
                        for sid, sess in wa_sessions.items():
                            if sess.get("code") == target_code:
                                sess["status"] = "verified"
                                sess["phone"] = sender_phone
                                sess["verifiedAt"] = datetime.now(timezone.utc).isoformat()
                                verified_sid = sid
                                break

                    # If not found in memory, create a verified record anyway
                    if not verified_sid and target_session_id:
                        wa_sessions[target_session_id] = {
                            "sessionId": target_session_id,
                            "code": target_code,
                            "status": "verified",
                            "phone": sender_phone,
                            "verifiedAt": datetime.now(timezone.utc).isoformat()
                        }
                        verified_sid = target_session_id

                if verified_sid:
                    sync_session_to_firebase(verified_sid, {
                        "status": "verified",
                        "phone": sender_phone,
                        "verifiedAt": datetime.now(timezone.utc).isoformat()
                    })
                    print(f"[WhatsApp Simulate] ✅ Session {verified_sid} marked verified with phone +{sender_phone}")
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": True,
                        "sessionId": verified_sid,
                        "phone": sender_phone,
                        "message": "Simulated WhatsApp verification succeeded"
                    }).encode('utf-8'))
                    return
                else:
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": True,
                        "message": "Simulation registered"
                    }).encode('utf-8'))
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
    print("🌴 SHALOM KERALA STORES — RETAIL POS, STOREFRONT & WHATSAPP AUTH")
    print("   Location: Gorakhpur, Uttar Pradesh | Official WA: +91 73793 25499")
    print("=" * 68)
    print(f"✅ Local Server Running:     {local_url}")
    print(f"📱 Phone & Wi-Fi Access:     {lan_url}")
    print(f"💬 WhatsApp Webhook Live:    {local_url}/webhook/whatsapp")
    print("-" * 68)
    print(f"🛒 Public E-Commerce Store:  {local_url}/index.html")
    print(f"🧾 POS Billing Counter:      {local_url}/billing.html")
    print(f"📦 Inventory & Stock ERP:    {local_url}/inventory.html")
    print(f"📊 Executive Dashboard:      {local_url}/dashboard.html")
    print("=" * 68)
    print("💡 Inbound WhatsApp Verification Active: Free reverse verification")
    print("   Users send code to +91 73793 25499 -> webhook unlocks automatically!")
    print("   Press Ctrl+C to stop server.\n")

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
