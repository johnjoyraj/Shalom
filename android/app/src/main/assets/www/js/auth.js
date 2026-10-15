/**
 * Shalom Kerala Stores - Authentication & Security Guard
 * Restricts access to ERP Inventory Console strictly to: johnjoyraj@gmail.com
 * Supports:
 *  1. Google Sign-In OAuth (Google Identity Services)
 *  2. Master Admin PIN (Default: 7379 - Instant zero-setup unlock)
 */

const SHALOM_AUTH = {
  // Only this email address is authorized
  AUTHORIZED_EMAIL: "johnjoyraj@gmail.com",

  // Default Master PIN (store phone prefix: 7379)
  DEFAULT_PIN: "7379",

  // Google OAuth 2.0 Web Client ID
  CLIENT_ID: localStorage.getItem("shalom_google_client_id") || "799568472830-4odid77nfbjb8ca1uac8ps97liccpi1r.apps.googleusercontent.com",

  STORAGE_KEY: "shalom_erp_auth_session",

  getMasterPin() {
    return localStorage.getItem("shalom_master_pin") || this.DEFAULT_PIN;
  },

  setMasterPin(newPin) {
    if (newPin && newPin.trim().length >= 4) {
      localStorage.setItem("shalom_master_pin", newPin.trim());
      return true;
    }
    return false;
  },

  init() {
    this.injectStyles();
    this.checkExistingSession();
  },

  injectStyles() {
    if (document.getElementById("shalom-auth-styles")) return;
    const style = document.createElement("style");
    style.id = "shalom-auth-styles";
    style.textContent = `
      #inventoryAuthOverlay {
        position: fixed;
        inset: 0;
        z-index: 9999999;
        background: radial-gradient(circle at 50% 30%, #062b1e 0%, #02120b 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #ffffff;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }
      #inventoryAuthOverlay.authenticated {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }
      .auth-card {
        background: rgba(12, 45, 33, 0.94);
        border: 1.5px solid rgba(212, 175, 55, 0.5);
        border-radius: 20px;
        padding: 34px 30px;
        max-width: 460px;
        width: 100%;
        text-align: center;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65), 0 0 35px rgba(212, 175, 55, 0.15);
        animation: authFadeUp 0.35s ease;
      }
      @keyframes authFadeUp {
        from { opacity: 0; transform: translateY(20px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .auth-shield-icon {
        width: 64px;
        height: 64px;
        background: linear-gradient(135deg, #d4af37, #997c1f);
        color: #03140e;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
        margin-bottom: 14px;
        box-shadow: 0 8px 24px rgba(212, 175, 55, 0.35);
      }
      .auth-title {
        font-size: 1.3rem;
        font-weight: 800;
        letter-spacing: 0.5px;
        margin: 0 0 4px 0;
        color: #ffffff;
      }
      .auth-subtitle {
        font-size: 0.86rem;
        color: #b3c9be;
        margin: 0 0 16px 0;
        line-height: 1.4;
      }
      .auth-restriction-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(212, 175, 55, 0.15);
        border: 1px solid rgba(212, 175, 55, 0.4);
        color: #f7e7a9;
        font-size: 0.8rem;
        padding: 5px 14px;
        border-radius: 20px;
        margin-bottom: 20px;
        font-weight: 600;
      }
      .auth-btn-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 44px;
        margin-bottom: 12px;
      }
      .auth-divider-row {
        margin: 18px 0;
        display: flex;
        align-items: center;
        color: #648a79;
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 1px;
      }
      .auth-divider-line {
        flex: 1;
        height: 1px;
        background: rgba(212, 175, 55, 0.25);
      }
      .auth-pin-form {
        display: flex;
        gap: 8px;
        justify-content: center;
      }
      .auth-pin-input {
        flex: 1;
        max-width: 250px;
        padding: 10px 14px;
        border-radius: 10px;
        border: 1.5px solid rgba(212, 175, 55, 0.4);
        background: #031810;
        color: #ffffff;
        font-size: 1rem;
        text-align: center;
        letter-spacing: 2px;
        outline: none;
        transition: border-color 0.2s ease;
      }
      .auth-pin-input:focus {
        border-color: #d4af37;
        box-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
      }
      .auth-pin-btn {
        background: linear-gradient(135deg, #d4af37, #aa8520);
        color: #03140e;
        border: none;
        padding: 10px 18px;
        border-radius: 10px;
        font-weight: 800;
        cursor: pointer;
        font-size: 0.88rem;
        transition: transform 0.15s ease;
      }
      .auth-pin-btn:hover {
        transform: translateY(-1px);
      }
      .auth-alert-box {
        background: rgba(239, 68, 68, 0.18);
        border: 1px solid rgba(239, 68, 68, 0.5);
        color: #fca5a5;
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 0.84rem;
        margin-top: 14px;
        text-align: left;
        line-height: 1.4;
        display: none;
      }
      .auth-config-toggle {
        margin-top: 14px;
        font-size: 0.76rem;
        color: #7d998d;
        cursor: pointer;
        text-decoration: underline;
        background: none;
        border: none;
        padding: 0;
      }
      .auth-config-box {
        margin-top: 12px;
        padding: 14px;
        background: rgba(0, 0, 0, 0.35);
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        text-align: left;
        display: none;
      }
      .auth-config-box input {
        width: 100%;
        padding: 8px 10px;
        border-radius: 6px;
        border: 1px solid #3d6052;
        background: #061a13;
        color: #ffffff;
        font-size: 0.8rem;
        margin-top: 6px;
        margin-bottom: 8px;
        box-sizing: border-box;
      }
      .auth-config-box button {
        background: #d4af37;
        color: #03140e;
        border: none;
        padding: 6px 12px;
        font-size: 0.78rem;
        font-weight: 700;
        border-radius: 6px;
        cursor: pointer;
      }
      .auth-user-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(212, 175, 55, 0.4);
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        color: #ffffff;
      }
      .auth-user-avatar {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        object-fit: cover;
      }
      .auth-logout-btn {
        background: rgba(239, 68, 68, 0.2);
        border: 1px solid rgba(239, 68, 68, 0.5);
        color: #fca5a5;
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 0.76rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .auth-logout-btn:hover {
        background: rgba(239, 68, 68, 0.4);
        color: #ffffff;
      }
    `;
    document.head.appendChild(style);
  },

  checkExistingSession() {
    try {
      const saved = sessionStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const user = JSON.parse(saved);
        if (user && user.email && user.email.toLowerCase() === this.AUTHORIZED_EMAIL.toLowerCase()) {
          this.unlockInterface(user);
          return;
        }
      }
    } catch (e) {
      console.warn("Session check error:", e);
    }
    this.renderLockScreen();
  },

  renderLockScreen() {
    document.body.classList.remove("auth-cleared");
    let overlay = document.getElementById("inventoryAuthOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "inventoryAuthOverlay";
      document.body.prepend(overlay);
    }
    overlay.classList.remove("authenticated");

    overlay.innerHTML = `
      <div class="auth-card">
        <div class="auth-shield-icon">🛡️</div>
        <h2 class="auth-title">Restricted Inventory ERP</h2>
        <p class="auth-subtitle">Shalom Kerala Stores — Retail POS & Inventory ERP</p>
        
        <div class="auth-restriction-pill">
          <span>🔒 Authorized: <strong>${this.AUTHORIZED_EMAIL}</strong></span>
        </div>

        <!-- Method 1: Instant Admin PIN Unlock (Hassle-free) -->
        <form class="auth-pin-form" id="authPinForm" onsubmit="return false;">
          <input type="password" id="authPinInput" class="auth-pin-input" placeholder="Admin PIN (Default: 7379)" maxlength="16" autofocus autocomplete="current-password">
          <button type="submit" id="authPinSubmitBtn" class="auth-pin-btn">
            Unlock 🔓
          </button>
        </form>
        <div style="font-size: 0.72rem; color: #8ba99b; margin-top: 6px;">
          🔑 Default Master PIN: <strong>7379</strong>
        </div>

        <!-- Divider -->
        <div class="auth-divider-row">
          <span class="auth-divider-line"></span>
          <span style="padding: 0 10px;">OR SIGN IN WITH GOOGLE</span>
          <span class="auth-divider-line"></span>
        </div>

        <!-- Method 2: Google Sign-In Container -->
        <div id="googleSignInButtonBox" class="auth-btn-wrapper">
          <div style="font-size: 0.82rem; color: #a4beaf;">Loading Google Sign-In...</div>
        </div>

        <div id="authAlertBox" class="auth-alert-box"></div>

        <div>
          <button type="button" class="auth-config-toggle" id="authConfigToggleBtn">
            ⚙️ Google OAuth Client ID Settings
          </button>
        </div>

        <div id="authConfigBox" class="auth-config-box">
          <div style="font-size: 0.76rem; color: #a2b8ad; margin-bottom: 4px;">
            If you get <code>401: invalid_client</code>, enter your Web Client ID from Google Cloud Console:
          </div>
          <input type="text" id="authClientIdInput" placeholder="xxxx.apps.googleusercontent.com" value="${this.CLIENT_ID.startsWith('7379325499') ? '' : this.CLIENT_ID}">
          <div style="display: flex; gap: 8px;">
            <button type="button" id="authSaveClientIdBtn">Save & Refresh</button>
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="font-size: 0.75rem; color: #d4af37; align-self: center; text-decoration: underline;">
              Get Client ID →
            </a>
          </div>
        </div>

        <div style="margin-top: 20px; font-size: 0.75rem; color: #6f8f80;">
          <a href="index.html" style="color: #d4af37; text-decoration: none;">← Return to Customer Store</a>
        </div>
      </div>
    `;

    // Handle PIN Unlock
    const pinForm = document.getElementById("authPinForm");
    const pinInput = document.getElementById("authPinInput");
    const alertBox = document.getElementById("authAlertBox");

    const handlePinSubmit = () => {
      const entered = pinInput.value.trim();
      const correctPin = this.getMasterPin();

      if (entered === correctPin) {
        // PIN Verified!
        const userSession = {
          email: this.AUTHORIZED_EMAIL,
          name: "John Joyraj (Admin PIN)",
          picture: "",
          loginTime: Date.now()
        };
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(userSession));
        this.unlockInterface(userSession);
      } else {
        alertBox.innerHTML = `<strong>❌ Incorrect PIN</strong><br>Default master PIN is <code>7379</code>. Please try again.`;
        alertBox.style.display = "block";
        pinInput.value = "";
        pinInput.focus();
      }
    };

    pinForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handlePinSubmit();
    });

    document.getElementById("authConfigToggleBtn").addEventListener("click", () => {
      const box = document.getElementById("authConfigBox");
      box.style.display = box.style.display === "block" ? "none" : "block";
    });

    document.getElementById("authSaveClientIdBtn").addEventListener("click", () => {
      const val = document.getElementById("authClientIdInput").value.trim();
      if (val) {
        localStorage.setItem("shalom_google_client_id", val);
        this.CLIENT_ID = val;
        alert("Google Client ID saved! Initializing Google Sign-In...");
        this.initGoogleClient();
      }
    });

    this.initGoogleClient();
  },

  initGoogleClient() {
    const btnBox = document.getElementById("googleSignInButtonBox");

    // Wait for Google Identity Services script
    if (typeof window.google === "undefined" || !window.google.accounts || !window.google.accounts.id) {
      setTimeout(() => this.initGoogleClient(), 300);
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: this.CLIENT_ID,
        callback: (response) => this.handleCredentialResponse(response),
        auto_select: false,
        cancel_on_tap_outside: false
      });

      btnBox.innerHTML = "";
      window.google.accounts.id.renderButton(btnBox, {
        theme: "filled_blue",
        size: "large",
        shape: "pill",
        text: "signin_with",
        width: 280
      });

      // Also trigger One-Tap prompt for quick login
      window.google.accounts.id.prompt();
    } catch (err) {
      console.error("Google Auth init failed:", err);
      if (btnBox) {
        btnBox.innerHTML = `
          <button type="button" style="background: #ffffff; color: #1f1f1f; border: 1px solid #dadce0; border-radius: 20px; padding: 10px 18px; font-weight: 600; font-size: 0.88rem; display: inline-flex; align-items: center; gap: 8px; cursor: pointer;" onclick="document.getElementById('authConfigBox').style.display='block'">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.14C3.27 21.36 7.34 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.59H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.41l4.02-3.14z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.64 1.26 6.59l4.02 3.14c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
            <span>Sign in with Google</span>
          </button>
        `;
      }
    }
  },

  handleCredentialResponse(response) {
    const alertBox = document.getElementById("authAlertBox");
    if (!response || !response.credential) {
      if (alertBox) {
        alertBox.textContent = "Google Sign-In failed or was cancelled. Please try again.";
        alertBox.style.display = "block";
      }
      return;
    }

    const payload = this.parseJwt(response.credential);
    if (!payload || !payload.email) {
      if (alertBox) {
        alertBox.textContent = "Could not read Google account information.";
        alertBox.style.display = "block";
      }
      return;
    }

    const userEmail = payload.email.toLowerCase().trim();
    if (userEmail === this.AUTHORIZED_EMAIL.toLowerCase().trim()) {
      // ACCESS GRANTED
      const userSession = {
        email: payload.email,
        name: payload.name || "John Joyraj",
        picture: payload.picture || "",
        loginTime: Date.now()
      };
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(userSession));
      this.unlockInterface(userSession);
    } else {
      // ACCESS DENIED
      if (alertBox) {
        alertBox.innerHTML = `
          <strong>🚫 Access Denied</strong><br>
          Signed in as: <code>${payload.email}</code><br>
          This ERP is strictly restricted to <strong>${this.AUTHORIZED_EMAIL}</strong>. No other accounts are permitted.
        `;
        alertBox.style.display = "block";
      }
    }
  },

  parseJwt(token) {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("JWT parse failed:", e);
      return null;
    }
  },

  unlockInterface(user) {
    document.body.classList.add("auth-cleared");
    const overlay = document.getElementById("inventoryAuthOverlay");
    if (overlay) {
      overlay.classList.add("authenticated");
    }

    // Add user badge and sign-out to ERP header
    this.renderHeaderUserBadge(user);
  },

  renderHeaderUserBadge(user) {
    const headerRight = document.querySelector(".erp-header-right");
    if (!headerRight || document.getElementById("erpUserAuthBadge")) return;

    const badgeWrapper = document.createElement("div");
    badgeWrapper.id = "erpUserAuthBadge";
    badgeWrapper.style.cssText = "display: flex; align-items: center; gap: 8px;";

    const avatarHtml = user.picture
      ? `<img src="${user.picture}" class="auth-user-avatar" alt="${user.name}" referrerpolicy="no-referrer">`
      : `<span style="font-size: 1rem;">🛡️</span>`;

    badgeWrapper.innerHTML = `
      <div class="auth-user-badge">
        ${avatarHtml}
        <span style="font-weight: 600;">${user.email}</span>
      </div>
      <button type="button" class="auth-config-toggle" id="changePinHeaderBtn" style="color: #d4af37; font-size: 0.74rem;" title="Change Master PIN">
        Change PIN
      </button>
      <button type="button" class="auth-logout-btn" id="erpSignOutBtn" title="Lock Inventory ERP">
        🔒 Sign Out
      </button>
    `;

    headerRight.prepend(badgeWrapper);

    document.getElementById("erpSignOutBtn").addEventListener("click", () => {
      this.signOut();
    });

    document.getElementById("changePinHeaderBtn").addEventListener("click", () => {
      const newPin = prompt("Enter new Admin PIN (minimum 4 digits):");
      if (newPin) {
        if (this.setMasterPin(newPin)) {
          alert("Admin PIN updated successfully!");
        } else {
          alert("PIN must be at least 4 digits.");
        }
      }
    });
  },

  signOut() {
    sessionStorage.removeItem(this.STORAGE_KEY);
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    const badge = document.getElementById("erpUserAuthBadge");
    if (badge) badge.remove();
    this.renderLockScreen();
  }
};

// Auto-run on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => SHALOM_AUTH.init());
} else {
  SHALOM_AUTH.init();
}
