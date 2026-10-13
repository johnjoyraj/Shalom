/**
 * Shalom Kerala Stores - Customer Online Order Queue
 * Synchronizes customer orders between index.html and inventory.html
 * Enforces rule: Orders only enter permanent billing data after Store Admin confirmation.
 */

class ShalomOrderQueue {
  constructor() {
    this.storageKey = 'shalom_store_orders_v1';
    this.channelName = 'shalom_orders_broadcast';
    this.broadcastChannel = null;
    
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(this.channelName);
        this.broadcastChannel.onmessage = (event) => {
          this.notifyListeners(event.data);
        };
      }
    } catch (e) {
      console.log('BroadcastChannel not supported, falling back to storage events');
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === this.storageKey) {
          this.notifyListeners({ type: 'ORDER_UPDATED' });
        }
      });
    }

    this.listeners = [];

    // Connect to Google Firebase Real-Time Cloud Sync
    if (typeof ShalomCloudSync !== 'undefined') {
      ShalomCloudSync.onOrders((cloudOrders) => {
        this.mergeCloudOrders(cloudOrders);
      });
    }
  }

  mergeCloudOrders(cloudOrders) {
    if (!Array.isArray(cloudOrders)) return;
    const local = this.getOrders();
    const map = new Map();

    // Prioritize cloud orders
    cloudOrders.forEach(o => {
      if (o && o.orderId) map.set(String(o.orderId).trim(), o);
    });

    // Keep any local un-synced orders
    local.forEach(o => {
      const id = String(o.orderId).trim();
      if (!map.has(id)) {
        map.set(id, o);
        // Also push to cloud if cloud is connected
        if (typeof ShalomCloudSync !== 'undefined' && ShalomCloudSync.isReady()) {
          ShalomCloudSync.pushCustomerOrder(o);
        }
      }
    });

    const merged = Array.from(map.values());
    merged.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(merged));
    } catch (e) {}

    this.notifyListeners({ type: 'CLOUD_SYNC_UPDATED' });
  }

  getOrders() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveOrders(orders, broadcast = true) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(orders));
      if (broadcast && this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'ORDER_UPDATED', timestamp: Date.now() });
      }
      this.notifyListeners({ type: 'ORDER_UPDATED' });
    } catch (e) {
      console.error('Failed to save orders queue', e);
    }
  }

  getPendingOrders() {
    return this.getOrders().filter(o => o.status === 'PENDING');
  }

  getCustomerOrders(phone) {
    if (!phone) return this.getOrders();
    const clean = phone.replace(/\D/g, '');
    return this.getOrders().filter(o => {
      const oPhone = (o.customer && o.customer.phone ? o.customer.phone : '').replace(/\D/g, '');
      return oPhone.includes(clean) || clean.includes(oPhone);
    });
  }

  getOrderById(orderId) {
    if (!orderId) return null;
    const cleanId = String(orderId).trim();
    return this.getOrders().find(o => String(o.orderId).trim() === cleanId);
  }

  /**
   * Customer submits an order from index.html
   * Status is set to PENDING (Awaiting Store Admin Confirmation)
   * Synced to Google Cloud Realtime Database instantly
   */
  submitCustomerOrder(orderPayload) {
    const orders = this.getOrders();
    const newOrder = {
      ...orderPayload,
      status: 'PENDING', // PENDING -> CONFIRMED -> REJECTED
      submittedAt: new Date().toISOString(),
      confirmedAt: null,
      billNo: null
    };

    orders.unshift(newOrder);
    this.saveOrders(orders);

    // Sync to Cloud
    if (typeof ShalomCloudSync !== 'undefined' && ShalomCloudSync.isReady()) {
      ShalomCloudSync.pushCustomerOrder(newOrder);
    }

    return newOrder;
  }

  /**
   * Admin confirms order in inventory.html
   * Status is set to CONFIRMED, linked to permanent POS Bill number, and synced to Cloud
   */
  confirmOrder(orderId, billNo, billRecord = null) {
    const orders = this.getOrders();
    const cleanId = String(orderId).trim();
    const target = orders.find(o => String(o.orderId).trim() === cleanId);
    if (!target) return null;

    target.status = 'CONFIRMED';
    target.confirmedAt = new Date().toISOString();
    target.billNo = billNo;

    this.saveOrders(orders);

    // Sync confirmation & permanent bill to Cloud
    if (typeof ShalomCloudSync !== 'undefined' && ShalomCloudSync.isReady()) {
      ShalomCloudSync.confirmOrder(cleanId, billNo, billRecord);
    }

    return target;
  }

  /**
   * Admin rejects order
   */
  rejectOrder(orderId, reason = 'Out of stock or payment unverified') {
    const orders = this.getOrders();
    const cleanId = String(orderId).trim();
    const target = orders.find(o => String(o.orderId).trim() === cleanId);
    if (!target) return null;

    target.status = 'REJECTED';
    target.rejectedAt = new Date().toISOString();
    target.rejectReason = reason;

    this.saveOrders(orders);

    // Sync rejection to Cloud
    if (typeof ShalomCloudSync !== 'undefined' && ShalomCloudSync.isReady()) {
      ShalomCloudSync.rejectOrder(cleanId, reason);
    }

    return target;
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(data) {
    this.listeners.forEach(fn => {
      try {
        fn(data);
      } catch (e) {
        console.error('Error in order queue listener', e);
      }
    });
  }
}

// Global Order Queue Instance
const shalomOrderQueue = new ShalomOrderQueue();
