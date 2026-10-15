/**
 * Shalom Kerala Stores - Google Firebase Real-Time Cloud Sync
 * Enables multi-device real-time sync between customer mobile phones and store ERP.
 * Stores customer orders & POS billing data permanently in the cloud.
 */

// Built-in Google Firebase Configuration for Shalom Kerala Stores
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCDqiuu-mxG7jDrDt1CwFUhIe5kVpkaSSI",
  authDomain: "adonaibroadcast-11095.firebaseapp.com",
  databaseURL: "https://adonaibroadcast-11095.firebaseio.com",
  projectId: "adonaibroadcast-11095",
  storageBucket: "adonaibroadcast-11095.firebasestorage.app",
  messagingSenderId: "701495282226",
  appId: "1:701495282226:web:eb37af998fc93294f08a2b",
  measurementId: "G-Q2P00PQPGC"
};

class ShalomCloudSyncService {
  constructor() {
    this.storageKey = 'shalom_firebase_config';
    this.statusListeners = [];
    this.ordersListeners = [];
    this.billsListeners = [];
    this.db = null;
    this.app = null;
    this.isConnected = false;
    this.isConfigured = false;
    this.recaptchaVerifier = null;
    this.confirmationResult = null;
    this.currentPendingAuth = null;

    // Default configuration (loads from localStorage or embedded default)
    this.config = this.loadConfig();
    this.init();
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved Firebase config', e);
    }
    return { ...DEFAULT_FIREBASE_CONFIG };
  }

  saveConfig(newConfig) {
    try {
      if (typeof newConfig === 'string') {
        newConfig = JSON.parse(newConfig);
      }
      localStorage.setItem(this.storageKey, JSON.stringify(newConfig));
      this.config = newConfig;
      this.init();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  clearConfig() {
    try {
      localStorage.removeItem(this.storageKey);
      this.config = null;
      this.isConnected = false;
      this.isConfigured = false;
      this.db = null;
      this.notifyStatus(false, 'Cloud Sync disconnected');
      return true;
    } catch (e) {
      return false;
    }
  }

  init() {
    if (!this.config || !this.config.apiKey) {
      this.isConfigured = false;
      this.isConnected = false;
      this.notifyStatus(false, 'Not configured. Enter Firebase keys in Cloud Settings.');
      return false;
    }

    if (!this.config.databaseURL) {
      this.config.databaseURL = "https://adonaibroadcast-11095.firebaseio.com";
    }

    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK compat library not loaded');
      this.notifyStatus(false, 'Firebase SDK library loading...');
      return false;
    }

    try {
      // Initialize or reuse default app
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(this.config);
      } else {
        this.app = firebase.app();
      }

      this.db = firebase.database();
      this.isConfigured = true;

      // Monitor live connection status
      const connectedRef = this.db.ref('.info/connected');
      connectedRef.on('value', (snap) => {
        const val = snap.val() === true;
        this.isConnected = val;
        this.notifyStatus(val, val ? '🟢 Cloud Connected (Live)' : '🟡 Connecting to Google Cloud...');
      });

      // Attach internal listeners
      this.listenToCloudOrders();
      this.listenToCloudBills();

      return true;
    } catch (err) {
      console.error('Firebase initialization error', err);
      this.isConnected = false;
      this.notifyStatus(false, `Error: ${err.message}`);
      return false;
    }
  }

  isReady() {
    return this.isConfigured && this.db !== null;
  }

  // =========================================================================
  // CUSTOMER ORDERS CLOUD SYNC
  // =========================================================================

  /**
   * Pushes a customer order placed on index.html to Google Firebase
   */
  async pushCustomerOrder(order) {
    if (!this.isReady()) {
      console.log('Firebase not configured. Saved order locally in browser.');
      return false;
    }

    try {
      const cleanId = String(order.orderId).trim();
      const sanitizedOrder = JSON.parse(JSON.stringify(order));
      await this.db.ref(`orders/${cleanId}`).set(sanitizedOrder);
      this.lastSyncTime = new Date();
      console.log(`[CloudSync] Order #${cleanId} synced to Google Cloud!`);
      return true;
    } catch (err) {
      console.error('[CloudSync] Failed to push order to cloud:', err);
      return false;
    }
  }

  /**
   * Admin confirms order and saves permanent bill to cloud
   */
  async confirmOrder(orderId, billNo, billRecord = null) {
    if (!this.isReady()) return false;

    try {
      const cleanId = String(orderId).trim();
      await this.db.ref(`orders/${cleanId}`).update({
        status: 'CONFIRMED',
        billNo: billNo,
        confirmedAt: new Date().toISOString()
      });

      if (billRecord) {
        const cleanBillNo = String(billNo).replace(/[.#$\[\]]/g, '_');
        const sanitizedBill = JSON.parse(JSON.stringify(billRecord));
        await this.db.ref(`bills/${cleanBillNo}`).set(sanitizedBill);
      }
      return true;
    } catch (err) {
      console.error('[CloudSync] Failed to confirm order in cloud:', err);
      return false;
    }
  }

  /**
   * Admin rejects order
   */
  async rejectOrder(orderId, reason = 'Out of stock or payment unverified') {
    if (!this.isReady()) return false;

    try {
      const cleanId = String(orderId).trim();
      await this.db.ref(`orders/${cleanId}`).update({
        status: 'REJECTED',
        rejectReason: reason,
        rejectedAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      console.error('[CloudSync] Failed to reject order in cloud:', err);
      return false;
    }
  }

  /**
   * Listens to real-time incoming orders from all customer phones
   */
  listenToCloudOrders() {
    if (!this.db) return;

    const ordersRef = this.db.ref('orders');
    ordersRef.on('value', (snapshot) => {
      const data = snapshot.val();
      const list = [];
      if (data) {
        Object.keys(data).forEach(key => {
          if (data[key]) list.push(data[key]);
        });
      }
      // Sort newest first
      list.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
      this.ordersListeners.forEach(fn => {
        try { fn(list); } catch (e) { console.error('Orders listener error', e); }
      });
    }, (error) => {
      console.warn('Orders cloud listener error', error);
    });
  }

  /**
   * Listens to permanent POS bills stored on cloud
   */
  listenToCloudBills() {
    if (!this.db) return;

    const billsRef = this.db.ref('bills');
    billsRef.on('value', (snapshot) => {
      const data = snapshot.val();
      const list = [];
      if (data) {
        Object.keys(data).forEach(key => {
          if (data[key]) list.push(data[key]);
        });
      }
      list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      this.billsListeners.forEach(fn => {
        try { fn(list); } catch (e) { console.error('Bills listener error', e); }
      });
    }, (error) => {
      console.warn('Bills cloud listener error', error);
    });
  }

  // =========================================================================
  // GOOGLE FIREBASE PHONE SMS AUTHENTICATION
  // =========================================================================

  /**
   * Cleans any active reCAPTCHA instance to prevent stale widget errors
   */
  resetRecaptcha(containerId = 'recaptcha-container') {
    if (this.recaptchaVerifier) {
      try {
        this.recaptchaVerifier.clear();
      } catch (e) {}
      this.recaptchaVerifier = null;
    }
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {}
      window.recaptchaVerifier = null;
    }
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';
  }

  /**
   * Internal helper: Generates fallback OTP saved to Firebase RTDB and session
   */
  async _generateFallbackOtp(cleanPhone, customerName, reason) {
    const fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const payload = {
      phone: cleanPhone,
      name: (customerName || '').trim(),
      otp: fallbackOtp,
      createdAt: Date.now(),
      expiresAt: expiresAt,
      isFallback: true,
      reason: reason,
      verified: false
    };

    try {
      sessionStorage.setItem(`shalom_otp_${cleanPhone}`, JSON.stringify(payload));
    } catch (e) {}

    if (this.isReady()) {
      try {
        await this.db.ref(`otps/${cleanPhone}`).set(payload);
      } catch (e) {}
    }

    return {
      success: true,
      method: 'FALLBACK_OTP',
      fallbackOtp: fallbackOtp,
      phone: cleanPhone,
      name: customerName,
      expiresAt: expiresAt
    };
  }

  /**
   * Sends authentic telecom SMS via Google Firebase Phone Auth
   */
  async sendGooglePhoneOtp(phone, customerName = '', containerId = 'recaptcha-container') {
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return { success: false, error: 'Please enter a valid 10-digit Indian mobile number.' };
    }

    const intlPhone = `+91${cleanPhone}`;
    this.currentPendingAuth = {
      phone: cleanPhone,
      name: (customerName || '').trim(),
      intlPhone: intlPhone
    };

    // Ensure Firebase app is initialized
    if (!this.app) {
      this.init();
    }

    if (typeof firebase === 'undefined' || !firebase.auth) {
      console.warn('[CloudSync] firebase.auth compat not available. Using fallback.');
      return this._generateFallbackOtp(cleanPhone, customerName, 'Firebase Auth SDK not loaded');
    }

    try {
      // Clean previous reCAPTCHA widgets
      this.resetRecaptcha(containerId);

      // Create new invisible reCAPTCHA verifier
      this.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(containerId, {
        size: 'invisible',
        callback: () => {
          console.log('[CloudSync] Google reCAPTCHA passed');
        },
        'expired-callback': () => {
          console.warn('[CloudSync] Google reCAPTCHA expired, resetting');
          this.resetRecaptcha(containerId);
        }
      });

      console.log(`[CloudSync] Requesting Google SMS OTP for ${intlPhone}...`);
      const confirmationResult = await firebase.auth().signInWithPhoneNumber(intlPhone, this.recaptchaVerifier);
      this.confirmationResult = confirmationResult;

      return {
        success: true,
        method: 'GOOGLE_SMS',
        phone: cleanPhone,
        intlPhone: intlPhone,
        name: customerName,
        message: `Google has dispatched a 6-digit SMS verification code to ${intlPhone}`
      };
    } catch (err) {
      console.error('[CloudSync] Google Phone Auth error:', err);
      this.resetRecaptcha(containerId);

      // Handle specific Firebase configuration scenarios
      if (err.code === 'auth/operation-not-allowed') {
        const fallback = await this._generateFallbackOtp(cleanPhone, customerName, 'Phone Auth disabled in Console');
        return {
          ...fallback,
          requiresConsoleEnable: true,
          consoleUrl: 'https://console.firebase.google.com/project/adonaibroadcast-11095/authentication/providers',
          error: 'Google Phone SMS is not enabled in Firebase Console yet. Please enable "Phone" under Sign-in method.'
        };
      } else if (err.code === 'auth/unauthorized-domain') {
        const fallback = await this._generateFallbackOtp(cleanPhone, customerName, 'Domain unauthorized in Firebase');
        return {
          ...fallback,
          unauthorizedDomain: true,
          consoleUrl: 'https://console.firebase.google.com/project/adonaibroadcast-11095/authentication/settings',
          error: 'Current domain is not authorized in Firebase Console Authentication settings.'
        };
      } else if (err.code === 'auth/quota-exceeded') {
        const fallback = await this._generateFallbackOtp(cleanPhone, customerName, 'SMS Quota Exceeded');
        return {
          ...fallback,
          error: 'Google SMS quota limit reached for this hour. Fallback verification code generated.'
        };
      } else if (err.code === 'auth/invalid-phone-number') {
        return {
          success: false,
          error: 'Invalid phone number format. Please check the 10-digit number.'
        };
      } else {
        const fallback = await this._generateFallbackOtp(cleanPhone, customerName, err.message || 'SMS Error');
        return {
          ...fallback,
          error: err.message || 'Failed to dispatch Google SMS. Fallback code generated.'
        };
      }
    }
  }

  /**
   * Verifies the 6-digit SMS OTP via Google Firebase Auth or Fallback
   */
  async verifyGooglePhoneOtp(phone, enteredOtp) {
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const code = String(enteredOtp).trim();

    if (!code || code.length !== 6) {
      return { success: false, error: 'Please enter the 6-digit verification code.' };
    }

    // 1. If we have an active Google confirmationResult, authenticate with Google
    if (this.confirmationResult) {
      try {
        const userCredential = await this.confirmationResult.confirm(code);
        const user = userCredential.user;
        const custName = (this.currentPendingAuth && this.currentPendingAuth.name) || 'Customer';

        // Save verified customer record permanently in Firebase Database
        if (this.isReady()) {
          try {
            await this.db.ref(`customers/${cleanPhone}`).update({
              name: custName,
              phone: cleanPhone,
              authUid: user.uid,
              isVerified: true,
              verifiedVia: 'GOOGLE_SMS',
              verifiedAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString()
            });
          } catch (dbErr) {
            console.warn('[CloudSync] Failed to update customer in RTDB', dbErr);
          }
        }

        this.confirmationResult = null; // Reset once consumed
        return {
          success: true,
          method: 'GOOGLE_SMS',
          customer: {
            name: custName,
            phone: cleanPhone,
            authUid: user.uid,
            isVerified: true,
            verifiedVia: 'GOOGLE_SMS',
            verifiedAt: new Date().toISOString()
          }
        };
      } catch (authErr) {
        console.error('[CloudSync] Firebase confirmationResult.confirm failed:', authErr);
        if (authErr.code === 'auth/invalid-verification-code') {
          return { success: false, error: 'Incorrect 6-digit SMS code. Please recheck your SMS and try again.' };
        } else if (authErr.code === 'auth/code-expired') {
          return { success: false, error: 'SMS code has expired. Please click "Resend SMS".' };
        }
      }
    }

    // 2. Fallback check (from DB or sessionStorage)
    return this.verifyOtp(cleanPhone, code);
  }

  /**
   * Generates a 6-digit OTP, saves in Firebase /otps/{phone}, and returns verification payload (legacy fallback)
   */
  async generateAndSaveOtp(phone, customerName = '') {
    return this._generateFallbackOtp(phone, customerName, 'Manual generation');
  }

  /**
   * Verifies the 6-digit OTP against Cloud Storage (fallback)
   */
  async verifyOtp(phone, enteredOtp) {
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const code = String(enteredOtp).trim();

    let record = null;

    // Check Firebase first if available
    if (this.isReady()) {
      try {
        const snap = await this.db.ref(`otps/${cleanPhone}`).once('value');
        record = snap.val();
      } catch (err) {
        console.warn('Firebase OTP read failed, falling back to local', err);
      }
    }

    // Fallback to sessionStorage if not retrieved from cloud
    if (!record) {
      try {
        const saved = sessionStorage.getItem(`shalom_otp_${cleanPhone}`);
        if (saved) record = JSON.parse(saved);
      } catch (e) {}
    }

    if (!record) {
      return { success: false, error: 'No active code found. Please request a new SMS code.' };
    }

    if (Date.now() > record.expiresAt) {
      return { success: false, error: 'Verification code has expired. Please request a new SMS code.' };
    }

    if (record.otp !== code) {
      return { success: false, error: 'Incorrect verification code. Please check your SMS messages.' };
    }

    // Mark as verified
    record.verified = true;
    if (this.isReady()) {
      try {
        await this.db.ref(`otps/${cleanPhone}`).update({ verified: true });
        await this.db.ref(`customers/${cleanPhone}`).update({
          name: record.name || 'Customer',
          phone: cleanPhone,
          lastLoginAt: new Date().toISOString(),
          isVerified: true,
          verifiedVia: 'VERIFIED'
        });
      } catch (e) {}
    }

    return {
      success: true,
      customer: {
        name: record.name || 'Customer',
        phone: cleanPhone,
        isVerified: true,
        verifiedAt: new Date().toISOString()
      }
    };
  }

  // =========================================================================
  // SUBSCRIPTIONS
  // =========================================================================

  onStatusChange(fn) {
    this.statusListeners.push(fn);
    fn(this.isConnected, this.isConfigured ? (this.isConnected ? '🟢 Live' : '🟡 Connecting...') : '⚪ Not Setup');
  }

  notifyStatus(connected, message) {
    this.statusListeners.forEach(fn => {
      try { fn(connected, message); } catch (e) {}
    });
  }

  onOrders(fn) {
    this.ordersListeners.push(fn);
  }

  onBills(fn) {
    this.billsListeners.push(fn);
  }
}

// Global Cloud Sync Singleton
const ShalomCloudSync = new ShalomCloudSyncService();
