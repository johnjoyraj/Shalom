#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verification and Test Suite for Shalom WhatsApp Inbound Authentication
Tests:
  1. Meta Webhook Handshake Verification (GET /webhook/whatsapp)
  2. Frontend Session Registration (POST /api/whatsapp/register_session)
  3. Meta Inbound Message Handling & Extraction (POST /webhook/whatsapp)
  4. Instant Simulation API (POST /api/whatsapp/simulate)
  5. Session Status Real-Time Check (GET /api/whatsapp/status)
"""

import sys
import os
import json
import urllib.request
import urllib.parse
import threading
import time

# Ensure we import server.py from SHALOM directory
SHALOM_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SHALOM_DIR)

from server import ShalomHTTPHandler, WHATSAPP_CONFIG, wa_sessions, wa_sessions_lock
import socketserver

TEST_PORT = 8998

def run_test_server(server_ready_event, stop_event):
    server = socketserver.ThreadingTCPServer(("127.0.0.1", TEST_PORT), ShalomHTTPHandler)
    server.allow_reuse_address = True
    server_ready_event.set()
    while not stop_event.is_set():
        server.handle_request()
    server.server_close()

def main():
    print("=" * 65)
    print("🧪 Running Shalom WhatsApp Inbound Auth Verification Suite")
    print("=" * 65)

    server_ready = threading.Event()
    stop_event = threading.Event()
    server_thread = threading.Thread(target=run_test_server, args=(server_ready, stop_event), daemon=True)
    server_thread.start()
    server_ready.wait(timeout=3)
    time.sleep(0.3)

    base_url = f"http://127.0.0.1:{TEST_PORT}"

    try:
        # TEST 1: Health check
        print("\n[Test 1] Health endpoint check (/api/health)...")
        with urllib.request.urlopen(f"{base_url}/api/health", timeout=3) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            assert data.get("status") == "healthy"
            assert data.get("whatsapp_business") == "917379325499"
            print("  ✅ Passed: Server healthy and WhatsApp business number verified!")

        # TEST 2: Meta Webhook GET Handshake
        print("\n[Test 2] Meta Webhook Handshake (GET /webhook/whatsapp)...")
        test_challenge = "challenge_meta_12345"
        verify_token = WHATSAPP_CONFIG["verify_token"]
        handshake_url = f"{base_url}/webhook/whatsapp?hub.mode=subscribe&hub.challenge={test_challenge}&hub.verify_token={verify_token}"
        req = urllib.request.Request(handshake_url)
        with urllib.request.urlopen(req, timeout=3) as resp:
            challenge_reply = resp.read().decode('utf-8')
            assert challenge_reply == test_challenge
            print(f"  ✅ Passed: Handshake returned challenge '{challenge_reply}' with HTTP 200!")

        # TEST 3: Register Session from Frontend
        print("\n[Test 3] Frontend Session Registration (POST /api/whatsapp/register_session)...")
        test_code = "849201"
        test_session_id = "wa_sess_test_123456"
        reg_payload = {
            "sessionId": test_session_id,
            "code": test_code,
            "name": "Test Customer",
            "phone": "9876543210"
        }
        reg_req = urllib.request.Request(
            f"{base_url}/api/whatsapp/register_session",
            data=json.dumps(reg_payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(reg_req, timeout=3) as resp:
            reg_res = json.loads(resp.read().decode('utf-8'))
            assert reg_res.get("success") is True
            print("  ✅ Passed: Session registered in pending state!")

        # TEST 4: Check Session Status is Pending
        print("\n[Test 4] Status Check Pending (GET /api/whatsapp/status)...")
        with urllib.request.urlopen(f"{base_url}/api/whatsapp/status?sessionId={test_session_id}", timeout=3) as resp:
            status_data = json.loads(resp.read().decode('utf-8'))
            assert status_data.get("status") == "pending"
            print("  ✅ Passed: Session confirms 'pending' status!")

        # TEST 5: Simulate Meta Inbound WhatsApp Message
        print("\n[Test 5] Inbound Message Verification (POST /webhook/whatsapp)...")
        meta_webhook_payload = {
            "object": "whatsapp_business_account",
            "entry": [
                {
                    "id": "100000000000001",
                    "changes": [
                        {
                            "field": "messages",
                            "value": {
                                "messaging_product": "whatsapp",
                                "metadata": {
                                    "display_phone_number": "917379325499",
                                    "phone_number_id": "100000000000002"
                                },
                                "contacts": [
                                    {
                                        "profile": { "name": "John Doe" },
                                        "wa_id": "919876543210"
                                    }
                                ],
                                "messages": [
                                    {
                                        "from": "919876543210",
                                        "id": "wamid.HBgMOTE5ODc2NTQzMjEwFQIAEhgWM0VCMEFDMDk2ODdFNDdENEYxMDQA",
                                        "timestamp": "1710000000",
                                        "type": "text",
                                        "text": {
                                            "body": f"Verify Login Code: {test_code}"
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        meta_req = urllib.request.Request(
            f"{base_url}/webhook/whatsapp",
            data=json.dumps(meta_webhook_payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(meta_req, timeout=3) as resp:
            assert resp.status == 200
            print("  ✅ Passed: Meta incoming webhook acknowledged with HTTP 200!")

        # TEST 6: Check Session Status is now Verified
        print("\n[Test 6] Status Check Verified (GET /api/whatsapp/status)...")
        with urllib.request.urlopen(f"{base_url}/api/whatsapp/status?sessionId={test_session_id}", timeout=3) as resp:
            status_data = json.loads(resp.read().decode('utf-8'))
            assert status_data.get("status") == "verified", f"Expected 'verified', got: {status_data}"
            assert status_data.get("phone") == "919876543210"
            print(f"  ✅ Passed: Session successfully marked 'verified' with phone +{status_data.get('phone')}!")

        # TEST 7: Instant Simulation Endpoint
        print("\n[Test 7] Instant Simulation Endpoint (POST /api/whatsapp/simulate)...")
        sim_code = "112233"
        sim_session_id = "wa_sess_sim_778899"
        # Register sim session
        with wa_sessions_lock:
            wa_sessions[sim_session_id] = {
                "sessionId": sim_session_id,
                "code": sim_code,
                "status": "pending",
                "phone": None
            }

        sim_req = urllib.request.Request(
            f"{base_url}/api/whatsapp/simulate",
            data=json.dumps({"code": sim_code, "phone": "917379325499"}).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(sim_req, timeout=3) as resp:
            sim_res = json.loads(resp.read().decode('utf-8'))
            assert sim_res.get("success") is True

        with urllib.request.urlopen(f"{base_url}/api/whatsapp/status?sessionId={sim_session_id}", timeout=3) as resp:
            sim_status = json.loads(resp.read().decode('utf-8'))
            assert sim_status.get("status") == "verified"
            print("  ✅ Passed: Instant simulation verified successfully!")

        print("\n" + "=" * 65)
        print("🎉 ALL 7 TESTS PASSED SUCCESSFULLY! WhatsApp Reverse Auth Ready.")
        print("=" * 65)

    finally:
        stop_event.set()

if __name__ == "__main__":
    main()
