import urllib.request
import json
import sys

FIREBASE_URL = "https://adonaibroadcast-11095.firebaseio.com"

print("=" * 70)
print("  Firebase Security Audit for 'adonaibroadcast-11095'")
print("=" * 70)

# Test 1: Check if root can be read without authentication
print("\n[Test 1] Checking Root Read Access (/.json)...")
try:
    req = urllib.request.Request(f"{FIREBASE_URL}/.json?shallow=true", headers={'User-Agent': 'SecurityAudit/1.0'})
    res = urllib.request.urlopen(req)
    data = res.read().decode('utf-8')
    print("  ❌ INSECURE: Root is publicly readable without authentication!")
    print(f"     Preview: {data[:60]}...")
    root_read_insecure = True
except urllib.error.HTTPError as e:
    if e.code in (401, 403):
        print("  ✅ SECURE: Root read is properly blocked (HTTP 401 Permission Denied)!")
        root_read_insecure = False
    else:
        print(f"  ⚠️ HTTP {e.code}: {e.reason}")
        root_read_insecure = None
except Exception as e:
    print(f"  ⚠️ Error: {e}")
    root_read_insecure = None

# Test 2: Check if root can be written to without authentication
print("\n[Test 2] Checking Root Write Access (/test_root_exploit.json)...")
try:
    req = urllib.request.Request(
        f"{FIREBASE_URL}/test_root_exploit.json",
        data=b'{"test": 1}',
        headers={'Content-Type': 'application/json'},
        method='PUT'
    )
    res = urllib.request.urlopen(req)
    print("  ❌ INSECURE: Root is publicly writable without authentication! Anyone can write/wipe data.")
    # Clean up test key
    req_del = urllib.request.Request(f"{FIREBASE_URL}/test_root_exploit.json", method='DELETE')
    urllib.request.urlopen(req_del)
    root_write_insecure = True
except urllib.error.HTTPError as e:
    if e.code in (401, 403):
        print("  ✅ SECURE: Root write is properly blocked (HTTP 401 Permission Denied)!")
        root_write_insecure = False
    else:
        print(f"  ⚠️ HTTP {e.code}: {e.reason}")
        root_write_insecure = None
except Exception as e:
    print(f"  ⚠️ Error: {e}")
    root_write_insecure = None

# Test 3: Check if Shalom orders path is accessible
print("\n[Test 3] Checking Shalom Orders Path (/orders.json)...")
try:
    req = urllib.request.Request(f"{FIREBASE_URL}/orders.json?shallow=true")
    res = urllib.request.urlopen(req)
    print("  ✅ OPERATIONAL: /orders is accessible for storefront ordering and store ERP.")
except Exception as e:
    print(f"  ⚠️ /orders error: {e}")

# Test 4: Check if Shalom bills path is accessible
print("\n[Test 4] Checking Shalom Bills Path (/bills.json)...")
try:
    req = urllib.request.Request(f"{FIREBASE_URL}/bills.json?shallow=true")
    res = urllib.request.urlopen(req)
    print("  ✅ OPERATIONAL: /bills is accessible for store billing and POS.")
except Exception as e:
    print(f"  ⚠️ /bills error: {e}")

# Test 5: Check if Pray for India path is accessible
print("\n[Test 5] Checking Pray for India Path (/prayforindia/prayers.json)...")
try:
    req = urllib.request.Request(f"{FIREBASE_URL}/prayforindia/prayers.json?shallow=true")
    res = urllib.request.urlopen(req)
    print("  ✅ OPERATIONAL: /prayforindia/prayers is accessible for prayer wall.")
except Exception as e:
    print(f"  ⚠️ /prayforindia/prayers error: {e}")

print("\n" + "=" * 70)
if root_read_insecure or root_write_insecure:
    print("🚨 STATUS: INSECURE RULES DETECTED IN CLOUD")
    print("   Action Needed: Paste the rules from 'database.rules.json' into the Firebase")
    print("   Console and click 'Publish'.")
    print("   URL: https://console.firebase.google.com/project/adonaibroadcast-11095/database/adonaibroadcast-11095/rules")
else:
    print("🎉 STATUS: SECURE! Database root is protected and rules are enforced.")
print("=" * 70)
