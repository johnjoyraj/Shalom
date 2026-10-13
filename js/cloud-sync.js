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
    this.lastSyncTime = null;

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
