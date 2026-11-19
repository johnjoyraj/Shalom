# 🌴 Shalom Kerala Stores — WhatsApp Inbound Reverse Verification Webhook

Implements the **User-Initiated Reverse Verification ("Click-to-Verify")** flow from `signin idea.txt`.

---

## 💡 How It Works
1. **User taps "Verify with WhatsApp"**: App creates a session in Firestore/RTDB with a 6-digit code (e.g. `849201`).
2. **Deep Link / QR Code**: Opens WhatsApp chat to `+91 73793 25499` with pre-filled message `Verify Login Code: 849201`.
3. **User presses Send**: Because the user initiates contact, carrier SMS costs and Meta authentication template fees are **₹0.00 (100% Free)**.
4. **Webhook Receives Message**: Meta forwards message to `/webhook/whatsapp`. The webhook extracts code & verified sender phone number.
5. **Auto-Login**: Marks session `verified` in Firebase. The frontend `onSnapshot` / `on('value')` listener catches it in real time and automatically logs the user in!

---

## 🚀 Running Locally (with Python or Node.js)

### Option A: Built-in Python Server (Default - Zero Setup)
The root `server.py` already includes this entire webhook!
Simply run:
```bash
START_SHALOM_APP.bat
# Or: py -3 server.py
```
Webhook endpoint: `http://localhost:8085/webhook/whatsapp`

### Option B: Node.js / Express Webhook
```bash
cd webhook
npm install
npm start
```
Webhook endpoint: `http://localhost:3000/webhook/whatsapp`

---

## 🌐 Connecting with Meta Developer Console (Live WhatsApp Cloud API)

1. Go to [developers.facebook.com](https://developers.facebook.com) > Your App > **WhatsApp** > **Configuration**.
2. Under **Webhook**, click **Edit**:
   * **Callback URL**: `https://<YOUR_DOMAIN_OR_NGROK>/webhook/whatsapp`
   * **Verify Token**: `shalom_wa_verify_token_2026`
3. Click **Verify and Save**.
4. Under **Webhook fields**, click **Manage** and subscribe to **`messages`**.
5. Done! Inbound WhatsApp messages will now automatically verify customer and staff sessions.
