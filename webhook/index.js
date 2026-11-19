/**
 * Shalom Kerala Stores — WhatsApp Inbound Reverse Verification Webhook (Node.js)
 * Implements the architecture from "signin idea.txt"
 * Supports:
 *  - Meta Cloud API Webhook Handshake (GET /webhook/whatsapp)
 *  - Inbound Message Verification (POST /webhook/whatsapp)
 *  - Firebase Firestore + Realtime Database Dual Update
 *  - Firebase Custom Auth Token Creation
 *  - Direct Express Server OR Firebase Cloud Functions Export
 */

import express from "express";
import admin from "firebase-admin";

const PORT = process.env.PORT || 3000;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "shalom_wa_verify_token_2026";
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || "";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    admin.initializeApp({
      projectId: "adonaibroadcast-11095",
      databaseURL: "https://adonaibroadcast-11095.firebaseio.com"
    });
  }
}

const db = admin.firestore();
const rtdb = admin.database ? admin.database() : null;

const app = express();
app.use(express.json());

// Enable CORS for web app inspection
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

/**
 * 1. Meta Webhook Handshake Verification (GET)
 * Meta calls this when you configure the Callback URL in Meta App Dashboard
 */
app.get("/webhook/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ [Meta Webhook] Handshake verified successfully!");
    res.status(200).send(challenge);
  } else if (mode) {
    console.warn("❌ [Meta Webhook] Verification token mismatch.");
    res.sendStatus(403);
  } else {
    res.json({
      status: "active",
      service: "Shalom Kerala Stores WhatsApp Inbound Verification Webhook",
      verifyToken: WHATSAPP_VERIFY_TOKEN
    });
  }
});

/**
 * 2. Inbound WhatsApp Message Handler (POST)
 * Receives the pre-filled "Verify Login Code: 849201" sent by the customer
 */
app.post("/webhook/whatsapp", async (req, res) => {
  // Acknowledge Meta immediately with 200 OK
  res.sendStatus(200);

  try {
    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message || message.type !== "text") return;

    // Guaranteed real WhatsApp number (e.g., "919876543210")
    const senderPhone = String(message.from || "").replace(/\D/g, "");
    const text = (message.text?.body || "").trim();

    console.log(`📩 [WhatsApp Webhook] Incoming message from +${senderPhone}: "${text}"`);

    // Extract the 6-digit code from "Verify Login Code: 849201" or "Verify Code: 849201"
    const match = text.match(/(?:Verify (?:Login )?Code:\s*|Code:\s*)?(\d{6})/i);
    if (!match) {
      console.log("⚠️ No 6-digit code pattern found in message text.");
      return;
    }

    const receivedCode = match[1];
    console.log(`🔍 [WhatsApp Webhook] Extracted code: ${receivedCode}`);

    // 1. Find matching pending session in Firestore
    let matchedDoc = null;
    try {
      const snap = await db.collection("wa_verifications")
        .where("code", "==", receivedCode)
        .where("status", "==", "pending")
        .limit(1)
        .get();

      if (!snap.empty) {
        matchedDoc = snap.docs[0];
      }
    } catch (fsErr) {
      console.warn("Firestore search notice:", fsErr.message);
    }

    // 2. Generate Firebase Custom Auth Token tied to their verified phone number
    let customToken = null;
    try {
      customToken = await admin.auth().createCustomToken(`wa_${senderPhone}`, {
        phone: senderPhone,
        verifiedVia: "whatsapp_inbound"
      });
    } catch (authErr) {
      console.warn("Custom token generation notice:", authErr.message);
    }

    const verifiedPayload = {
      status: "verified",
      phone: senderPhone,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      customToken: customToken || null
    };

    // 3. Mark verified in Firestore
    if (matchedDoc) {
      await matchedDoc.ref.update(verifiedPayload);
      console.log(`🎉 [WhatsApp Webhook] Verified Firestore session doc: ${matchedDoc.id}`);
    }

    // 4. Mark verified in Realtime Database as well
    if (rtdb) {
      try {
        const rtdbSnap = await rtdb.ref("wa_verifications")
          .orderByChild("code")
          .equalTo(receivedCode)
          .once("value");

        const val = rtdbSnap.val();
        if (val) {
          const matchedKey = Object.keys(val).find(k => val[k].status === "pending");
          if (matchedKey) {
            await rtdb.ref(`wa_verifications/${matchedKey}`).update({
              status: "verified",
              phone: senderPhone,
              verifiedAt: new Date().toISOString(),
              customToken: customToken || null
            });
            console.log(`🎉 [WhatsApp Webhook] Verified RTDB session: ${matchedKey}`);
          }
        }
      } catch (rtErr) {
        console.warn("RTDB search notice:", rtErr.message);
      }
    }

    // 5. Optional: Send free confirmation reply back within 24hr service window
    if (WHATSAPP_API_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
      try {
        await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${WHATSAPP_API_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: senderPhone,
            type: "text",
            text: { body: "🌴 Shalom Kerala Stores: Your login code has been verified! Return to the app." }
          })
        });
      } catch (replyErr) {
        console.warn("Auto-reply notice:", replyErr.message);
      }
    }

  } catch (err) {
    console.error("❌ [WhatsApp Webhook] Unhandled processing error:", err);
  }
});

// Start Express server if executed directly
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🌴 Shalom WhatsApp Inbound Webhook listening on port ${PORT}`);
    console.log(`   Meta Callback URL: http://localhost:${PORT}/webhook/whatsapp`);
    console.log(`   Verify Token: ${WHATSAPP_VERIFY_TOKEN}`);
    console.log(`=======================================================`);
  });
}

// Export for Firebase Cloud Functions
export const whatsappWebhook = app;
export default app;
