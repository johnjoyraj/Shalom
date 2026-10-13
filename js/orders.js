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
  }

  getOrders() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveOrders(orders) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(orders));
      if (this.broadcastChannel) {
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
    return this.getOrders().find(o => o.orderId === orderId);
  }

  /**
   * Customer submits an order from index.html
   * Status is set to PENDING (Awaiting Store Admin Confirmation)
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
    return newOrder;
  }

  /**
   * Admin confirms order in inventory.html
   * Status is set to CONFIRMED and linked to permanent POS Bill number
   */
  confirmOrder(orderId, billNo) {
    const orders = this.getOrders();
    const target = orders.find(o => o.orderId === orderId);
    if (!target) return null;

    target.status = 'CONFIRMED';
    target.confirmedAt = new Date().toISOString();
    target.billNo = billNo;

    this.saveOrders(orders);
    return target;
  }

  /**
   * Admin rejects order
   */
  rejectOrder(orderId, reason = 'Out of stock or payment unverified') {
    const orders = this.getOrders();
    const target = orders.find(o => o.orderId === orderId);
    if (!target) return null;

    target.status = 'REJECTED';
    target.rejectedAt = new Date().toISOString();
    target.rejectReason = reason;

    this.saveOrders(orders);
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
