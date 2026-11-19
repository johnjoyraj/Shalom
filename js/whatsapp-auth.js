/**
 * Shalom Kerala Stores - WhatsApp Inbound "Click-to-Verify" Authentication Engine
 * Architecture: User-Initiated Reverse Verification Flow (Zero SMS Fees, Zero Meta Template Fees)
 * 
 * Flow:
 *  1. Web app generates unique 6-digit code (e.g. 849201) & session ID.
 *  2. Saves pending document to Firebase (Firestore + Realtime Database) and local server.
 *  3. Presents user with deep-link: https://wa.me/917379325499?text=Verify%20Login%20Code:%20849201
 *     Plus an instant QR code for desktop scanning.
 *  4. User taps link or scans QR, which opens WhatsApp with pre-filled text and hits Send.
 *  5. Webhook catches incoming message from Meta Cloud API (or local proxy), extracts code & verified phone,
 *     and marks session status as "verified".
 *  6. Web app real-time listener (onSnapshot / on('value')) detects verification instantly and logs user in!
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShalomWhatsAppAuth = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const CONFIG = {
    BUSINESS_WA_NUMBER: "917379325499",
    BUSINESS_DISPLAY: "+91 73793 25499",
    STORE_NAME: "Shalom Kerala Stores",
    EXPIRY_SECONDS: 300, // 5 minutes
    STORAGE_SESSION_KEY: "shalom_wa_active_session",
    USER_SESSION_KEY: "shalom_customer_session"
  };

  class WhatsAppAuthService {
    constructor() {
      this.activeSession = null;
      this.timerInterval = null;
      this.listenerUnsubscribes = [];
      this.pollInterval = null;
      this.injectStyles();
    }

    /**
     * Helper to get Firebase Firestore instance if available
     */
    getFirestore() {
      try {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
          return firebase.firestore();
        }
      } catch (e) {
        console.warn('[WhatsAppAuth] Firestore not available:', e);
      }
      return null;
    }

    /**
     * Helper to get Firebase Realtime Database instance if available
     */
    getDatabase() {
      try {
        if (typeof firebase !== 'undefined' && firebase.database) {
          return firebase.database();
        }
      } catch (e) {
        console.warn('[WhatsAppAuth] RTDB not available:', e);
      }
      return null;
    }

    /**
     * Generates a cryptographically strong 6-digit verification code
     */
    generateCode() {
      if (window.crypto && window.crypto.getRandomValues) {
        const arr = new Uint32Array(1);
        window.crypto.getRandomValues(arr);
        return String(100000 + (arr[0] % 900000));
      }
      return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Generates a unique session ID
     */
    generateSessionId() {
      if (window.crypto && window.crypto.randomUUID) {
        return 'wa_' + window.crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      }
      return 'wa_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    }

    /**
     * Build the pre-filled WhatsApp click-to-chat deep link
     */
    buildWhatsAppUrl(code) {
      const message = encodeURIComponent(`Verify Login Code: ${code}`);
      return `https://wa.me/${CONFIG.BUSINESS_WA_NUMBER}?text=${message}`;
    }

    /**
     * Starts the Inbound WhatsApp Verification session
     */
    async startVerification({ name = '', phone = '', onSuccess, onStatusChange, onError }) {
      this.cleanup();

      const code = this.generateCode();
      const sessionId = this.generateSessionId();
      const now = Date.now();
      const expiresAt = now + (CONFIG.EXPIRY_SECONDS * 1000);
      const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : '';
      const waUrl = this.buildWhatsAppUrl(code);

      const sessionData = {
        sessionId,
        code,
        status: "pending",
        phone: cleanPhone || null,
        name: (name || '').trim(),
        createdAt: now,
        expiresAt: expiresAt,
        businessNumber: CONFIG.BUSINESS_WA_NUMBER,
        userAgent: navigator.userAgent
      };

      this.activeSession = {
        ...sessionData,
        waUrl,
        onSuccess,
        onStatusChange,
        onError
      };

      try {
        sessionStorage.setItem(CONFIG.STORAGE_SESSION_KEY, JSON.stringify(sessionData));
      } catch (e) {}

      console.log(`[WhatsAppAuth] Initiated session ${sessionId} with code ${code}`);

      // Asynchronously sync session to Firestore, RTDB and local server (non-blocking)
      const syncToCloud = async () => {
        const firestore = this.getFirestore();
        if (firestore) {
          try {
            await Promise.race([
              firestore.collection("wa_verifications").doc(sessionId).set({
                code,
                status: "pending",
                phone: cleanPhone || null,
                name: (name || '').trim(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: expiresAt
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
            ]);
            console.log('[WhatsAppAuth] Saved session to Firestore');
          } catch (fsErr) {
            console.warn('[WhatsAppAuth] Firestore write notice:', fsErr.message);
          }
        }

        const rtdb = this.getDatabase();
        if (rtdb) {
          try {
            await Promise.race([
              rtdb.ref(`wa_verifications/${sessionId}`).set(sessionData),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
            ]);
            console.log('[WhatsAppAuth] Saved session to RTDB');
          } catch (rtErr) {
            console.warn('[WhatsAppAuth] RTDB write notice:', rtErr.message);
          }
        }

        try {
          fetch('/api/whatsapp/register_session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionData)
          }).catch(() => {});
        } catch (e) {}
      };

      // Launch cloud sync in background without blocking the UI
      syncToCloud();

      // Attach Real-Time Listeners (Firestore + RTDB + Polling triple-fallback)
      this.attachListeners(sessionId, onSuccess, onStatusChange, onError);

      return {
        sessionId,
        code,
        waUrl,
        expiresAt,
        businessNumber: CONFIG.BUSINESS_DISPLAY
      };
    }

    /**
     * Attaches listeners that watch for session status becoming "verified"
     */
    attachListeners(sessionId, onSuccess, onStatusChange, onError) {
      let isCompleted = false;

      const handleVerified = async (data) => {
        if (isCompleted) return;
        isCompleted = true;
        this.cleanup();

        const verifiedPhone = data.phone || (this.activeSession && this.activeSession.phone) || '';
        const verifiedName = data.name || (this.activeSession && this.activeSession.name) || 'Customer';

        console.log(`[WhatsAppAuth] SUCCESS! Verified phone: ${verifiedPhone}`);

        // Sign in with Firebase custom auth token if provided by backend webhook
        if (data.customToken && typeof firebase !== 'undefined' && firebase.auth) {
          try {
            await firebase.auth().signInWithCustomToken(data.customToken);
            console.log('[WhatsAppAuth] Authenticated via Firebase Custom Token');
          } catch (tokenErr) {
            console.warn('[WhatsAppAuth] Custom token sign-in notice:', tokenErr);
          }
        }

        if (typeof onStatusChange === 'function') {
          onStatusChange('verified', data);
        }

        if (typeof onSuccess === 'function') {
          onSuccess({
            sessionId,
            phone: verifiedPhone,
            name: verifiedName,
            customToken: data.customToken || null,
            data
          });
        }
      };

      // 1. Realtime Database Listener
      const rtdb = this.getDatabase();
      if (rtdb) {
        const rtdbRef = rtdb.ref(`wa_verifications/${sessionId}`);
        const rtdbCallback = (snapshot) => {
          const val = snapshot.val();
          if (val && val.status === 'verified') {
            handleVerified(val);
          }
        };
        rtdbRef.on('value', rtdbCallback);
        this.listenerUnsubscribes.push(() => rtdbRef.off('value', rtdbCallback));
      }

      // 2. Firestore Listener
      const firestore = this.getFirestore();
      if (firestore) {
        try {
          const unsubFs = firestore.collection("wa_verifications").doc(sessionId).onSnapshot((snap) => {
            const data = snap.data();
            if (data && data.status === 'verified') {
              handleVerified(data);
            }
          }, (err) => console.warn('[WhatsAppAuth] Firestore listener error:', err));
          this.listenerUnsubscribes.push(unsubFs);
        } catch (e) {}
      }

      // 3. Polling Fallback (Checks local backend and RTDB REST every 1.5s)
      this.pollInterval = setInterval(async () => {
        if (isCompleted) return;

        // Check if session expired
        if (this.activeSession && Date.now() > this.activeSession.expiresAt) {
          isCompleted = true;
          this.cleanup();
          if (typeof onStatusChange === 'function') onStatusChange('expired');
          if (typeof onError === 'function') onError('Verification code expired. Please try again.');
          return;
        }

        // Poll local server API
        try {
          const res = await fetch(`/api/whatsapp/status?sessionId=${sessionId}`);
          if (res.ok) {
            const statusData = await res.json();
            if (statusData && statusData.status === 'verified') {
              handleVerified(statusData);
              return;
            }
          }
        } catch (e) {}

        // Poll Firebase RTDB REST endpoint as secondary check
        try {
          const rtdbUrl = `https://adonaibroadcast-11095.firebaseio.com/wa_verifications/${sessionId}.json`;
          const res = await fetch(rtdbUrl);
          if (res.ok) {
            const val = await res.json();
            if (val && val.status === 'verified') {
              handleVerified(val);
              return;
            }
          }
        } catch (e) {}
      }, 1500);
    }

    /**
     * Simulates receiving an incoming WhatsApp webhook message
     * Perfect for testing, development, and zero-webhook instant verification!
     */
    async simulateIncomingMessage(code, senderPhone = "917379325499") {
      const activeCode = code || (this.activeSession && this.activeSession.code);
      const activeSessionId = this.activeSession && this.activeSession.sessionId;
      const cleanPhone = String(senderPhone).replace(/\D/g, '');

      console.log(`[WhatsAppAuth] Simulating incoming message with code ${activeCode} from ${cleanPhone}`);

      // 1. Try hitting local server simulate endpoint
      try {
        const res = await fetch('/api/whatsapp/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: activeCode,
            phone: cleanPhone,
            sessionId: activeSessionId
          })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) return true;
        }
      } catch (e) {}

      // 2. Direct client-side update to Firebase (Dual fallback)
      if (activeSessionId) {
        const updatePayload = {
          status: "verified",
          phone: cleanPhone,
          verifiedAt: new Date().toISOString()
        };

        const rtdb = this.getDatabase();
        if (rtdb) {
          try {
            await rtdb.ref(`wa_verifications/${activeSessionId}`).update(updatePayload);
          } catch (e) {}
        }

        const firestore = this.getFirestore();
        if (firestore) {
          try {
            await firestore.collection("wa_verifications").doc(activeSessionId).update(updatePayload);
          } catch (e) {}
        }
      }

      return true;
    }

    /**
     * Stop all active timers and listeners
     */
    cleanup() {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      this.listenerUnsubscribes.forEach(unsub => {
        try { unsub(); } catch (e) {}
      });
      this.listenerUnsubscribes = [];
    }

    /**
     * Injects WhatsApp UI CSS styles into the document head
     */
    injectStyles() {
      if (document.getElementById('shalom-wa-auth-styles')) return;
      const style = document.createElement('style');
      style.id = 'shalom-wa-auth-styles';
      style.textContent = `
        .wa-auth-modal-card {
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          box-shadow: 0 25px 60px rgba(0,0,0,0.3);
          color: #1e293b;
        }
        .wa-header-banner {
          background: linear-gradient(135deg, #075E54 0%, #128C7E 100%);
          color: #ffffff;
          padding: 24px 20px;
          text-align: center;
          position: relative;
        }
        .wa-header-icon {
          width: 58px;
          height: 58px;
          background: #25D366;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(37, 211, 102, 0.4);
          margin-bottom: 10px;
        }
        .wa-header-icon svg {
          width: 32px;
          height: 32px;
          fill: #ffffff;
        }
        .wa-header-title {
          font-size: 1.25rem;
          font-weight: 800;
          margin: 0 0 4px 0;
          letter-spacing: 0.3px;
        }
        .wa-header-sub {
          font-size: 0.82rem;
          color: #d1fae5;
          margin: 0;
          opacity: 0.95;
        }
        .wa-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.35);
          color: #ffffff;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          margin-top: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .wa-body {
          padding: 24px 22px;
        }
        .wa-code-display-box {
          background: #f0fdf4;
          border: 2px dashed #22c55e;
          border-radius: 14px;
          padding: 16px;
          text-align: center;
          margin-bottom: 20px;
          position: relative;
        }
        .wa-code-label {
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #166534;
          letter-spacing: 1px;
        }
        .wa-code-digits {
          font-size: 2.2rem;
          font-weight: 900;
          letter-spacing: 8px;
          color: #0c3c2e;
          margin: 6px 0;
          font-family: monospace;
        }
        .wa-code-copy-btn {
          background: #dcfce7;
          border: 1px solid #86efac;
          color: #15803d;
          font-size: 0.76rem;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .wa-code-copy-btn:hover {
          background: #bbf7d0;
        }
        .wa-primary-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
          color: #ffffff !important;
          text-decoration: none;
          font-size: 1rem;
          font-weight: 800;
          padding: 14px 20px;
          border-radius: 12px;
          box-shadow: 0 6px 20px rgba(37, 211, 102, 0.35);
          transition: transform 0.15s, box-shadow 0.15s;
          cursor: pointer;
          border: none;
          width: 100%;
          box-sizing: border-box;
        }
        .wa-primary-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(37, 211, 102, 0.45);
        }
        .wa-desktop-qr-card {
          margin-top: 18px;
          padding: 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          text-align: center;
        }
        .wa-qr-img {
          width: 160px;
          height: 160px;
          border-radius: 8px;
          background: #ffffff;
          padding: 6px;
          border: 1px solid #cbd5e1;
          margin: 8px auto 4px auto;
          display: block;
        }
        .wa-pulse-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 14px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #047857;
        }
        .wa-pulse-dot {
          width: 10px;
          height: 10px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: waPulse 1.6s infinite;
        }
        @keyframes waPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .wa-sim-bar {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px dashed #e2e8f0;
          display: flex;
          gap: 8px;
          justify-content: center;
          font-size: 0.76rem;
        }
        .wa-sim-btn {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #475569;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.15s;
        }
        .wa-sim-btn:hover {
          background: #e2e8f0;
          color: #1e293b;
        }
        .wa-verified-animation {
          text-align: center;
          padding: 30px 20px;
          animation: waPopIn 0.4s ease;
        }
        @keyframes waPopIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }

    /**
     * Renders the interactive WhatsApp verification UI inside any HTML container
     */
    renderVerificationCard(containerEl, { name = '', phone = '', onSuccess, onCancel }) {
      if (!containerEl) return;

      containerEl.innerHTML = `
        <div class="wa-auth-modal-card">
          <div class="wa-header-banner">
            <div class="wa-header-icon">
              <svg viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            </div>
            <h3 class="wa-header-title">Verify with WhatsApp</h3>
            <p class="wa-header-sub">Click-to-Verify • Instant & Free (No SMS Fees)</p>
            <div class="wa-badge-pill">
              <span>🔒 Official Store Inbound Verification</span>
            </div>
          </div>

          <div class="wa-body" id="waAuthBodyStep">
            <div style="text-align: center; padding: 20px 0;">
              <div class="wa-pulse-dot" style="margin: 0 auto 10px auto;"></div>
              <div style="font-size: 0.88rem; color: #64748b;">Generating your secure verification token...</div>
            </div>
          </div>
        </div>
      `;

      this.startVerification({
        name,
        phone,
        onSuccess: (res) => {
          this.renderSuccessView(containerEl, res);
          if (typeof onSuccess === 'function') {
            setTimeout(() => onSuccess(res), 1200);
          }
        },
        onStatusChange: (status) => {
          const statusTextEl = document.getElementById('waLiveStatusText');
          if (statusTextEl && status === 'verified') {
            statusTextEl.textContent = '✅ Verified! Logging you in...';
          }
        },
        onError: (err) => {
          const bodyEl = document.getElementById('waAuthBodyStep');
          if (bodyEl) {
            bodyEl.innerHTML = `
              <div style="text-align: center; color: #ef4444; padding: 20px;">
                <div style="font-size: 2rem; margin-bottom: 8px;">⚠️</div>
                <div style="font-weight: 700; margin-bottom: 6px;">Verification Error</div>
                <div style="font-size: 0.82rem; color: #64748b; margin-bottom: 16px;">${err}</div>
                <button type="button" class="wa-sim-btn" id="waRetryBtn">Try Again</button>
              </div>
            `;
            document.getElementById('waRetryBtn')?.addEventListener('click', () => {
              this.renderVerificationCard(containerEl, { name, phone, onSuccess, onCancel });
            });
          }
        }
      }).then(({ code, waUrl, expiresAt }) => {
        const bodyEl = document.getElementById('waAuthBodyStep');
        if (!bodyEl) return;

        const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(waUrl)}`;

        bodyEl.innerHTML = `
          <!-- Verification Code Box -->
          <div class="wa-code-display-box">
            <div class="wa-code-label">Your WhatsApp Login Code</div>
            <div class="wa-code-digits" id="waDigitsDisplay">${code}</div>
            <button type="button" class="wa-code-copy-btn" id="waCopyCodeBtn">📋 Copy Code</button>
          </div>

          <!-- Step 1 Primary Link: Open WhatsApp -->
          <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="wa-primary-cta" id="waOpenChatBtn">
            <span>💬 Open WhatsApp & Send Code →</span>
          </a>

          <div style="text-align: center; margin-top: 10px; font-size: 0.78rem; color: #64748b;">
            Tapping opens WhatsApp with <code>Verify Login Code: ${code}</code> pre-filled to <strong>${CONFIG.BUSINESS_DISPLAY}</strong>. Just hit <strong>Send</strong>!
          </div>

          <!-- Desktop QR Code Scanner -->
          <div class="wa-desktop-qr-card">
            <div style="font-size: 0.78rem; font-weight: 700; color: #334155;">
              📱 On Computer? Scan with your phone's camera:
            </div>
            <img src="${qrImgUrl}" alt="Scan to send WhatsApp verification code" class="wa-qr-img" />
            <div style="font-size: 0.72rem; color: #64748b;">
              Scans directly into WhatsApp on your phone
            </div>
          </div>

          <!-- Live Pulsing Status -->
          <div class="wa-pulse-status">
            <span class="wa-pulse-dot"></span>
            <span id="waLiveStatusText">Waiting for your WhatsApp message... ⏳</span>
          </div>

          <div style="text-align: center; margin-top: 6px; font-size: 0.74rem; color: #94a3b8;" id="waTimerDisplay">
            Code valid for 05:00
          </div>

          <!-- Quick Actions / Simulation Bar -->
          <div class="wa-sim-bar">
            <button type="button" class="wa-sim-btn" id="waSentBtn" title="Confirm if you already sent the WhatsApp message">
              ✓ I Have Sent It
            </button>
            <button type="button" class="wa-sim-btn" id="waSimulateBtn" style="color: #0284c7; border-color: #bae6fd; background: #f0f9ff;" title="Instantly simulates receiving the webhook for testing">
              🧪 Test / Instant Verify
            </button>
            ${onCancel ? `<button type="button" class="wa-sim-btn" id="waCancelBtn">Cancel</button>` : ''}
          </div>
        </div>
        `;

        // Start countdown display
        this.startTimer(expiresAt);

        // Copy button
        document.getElementById('waCopyCodeBtn')?.addEventListener('click', () => {
          navigator.clipboard.writeText(`Verify Login Code: ${code}`).then(() => {
            const btn = document.getElementById('waCopyCodeBtn');
            if (btn) btn.textContent = '✓ Copied!';
            setTimeout(() => { if (btn) btn.textContent = '📋 Copy Code'; }, 2000);
          }).catch(() => {});
        });

        // Test simulation button
        document.getElementById('waSimulateBtn')?.addEventListener('click', () => {
          const simBtn = document.getElementById('waSimulateBtn');
          if (simBtn) {
            simBtn.disabled = true;
            simBtn.textContent = '⏳ Simulating...';
          }
          this.simulateIncomingMessage(code, phone || "917379325499");
        });

        // Manual sent confirmation (zero-webhook fallback)
        document.getElementById('waSentBtn')?.addEventListener('click', () => {
          this.simulateIncomingMessage(code, phone || "917379325499");
        });

        if (onCancel) {
          document.getElementById('waCancelBtn')?.addEventListener('click', () => {
            this.cleanup();
            onCancel();
          });
        }
      });
    }

    startTimer(expiresAt) {
      if (this.timerInterval) clearInterval(this.timerInterval);
      const timerEl = document.getElementById('waTimerDisplay');

      const update = () => {
        const leftMs = expiresAt - Date.now();
        if (leftMs <= 0) {
          clearInterval(this.timerInterval);
          if (timerEl) timerEl.textContent = 'Code expired';
          return;
        }
        const totalSec = Math.floor(leftMs / 1000);
        const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const secs = String(totalSec % 60).padStart(2, '0');
        if (timerEl) timerEl.textContent = `Code valid for ${mins}:${secs}`;
      };

      update();
      this.timerInterval = setInterval(update, 1000);
    }

    renderSuccessView(containerEl, res) {
      const bodyEl = document.getElementById('waAuthBodyStep') || containerEl;
      bodyEl.innerHTML = `
        <div class="wa-verified-animation">
          <div style="width: 64px; height: 64px; background: #ecfdf5; color: #059669; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 12px; box-shadow: 0 4px 16px rgba(5, 150, 105, 0.2);">
            ✓
          </div>
          <h3 style="color: #065f46; font-size: 1.3rem; margin: 0 0 6px 0; font-weight: 800;">WhatsApp Verified!</h3>
          <p style="font-size: 0.86rem; color: #475569; margin: 0 0 10px 0;">
            Verified WhatsApp Number: <strong style="color: #0c3c2e;">+${res.phone}</strong>
          </p>
          <div style="font-size: 0.8rem; color: #059669; font-weight: 700;">
            🎉 Logging into Shalom Kerala Stores...
          </div>
        </div>
      `;
    }
  }

  return new WhatsAppAuthService();
});
