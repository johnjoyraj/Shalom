/**
 * Shalom Kerala Stores - Cart State Management
 * Handles additions, quantity controls, delivery options (Pick from store, 5km, 10km), coupons, and totals
 */

class ShalomCart {
  constructor() {
    this.storageKey = 'shalom_kerala_cart_v2';
    this.couponKey = 'shalom_kerala_applied_coupon';
    this.deliveryKey = 'shalom_kerala_delivery_option';
    
    this.items = this.loadCart();
    this.appliedCoupon = this.loadCoupon();
    this.selectedDelivery = this.loadDelivery(); // 'upto5km', 'upto10km', 'pickup'
    this.gstRate = 0.05; // 5% GST rate

    this.listeners = [];
  }

  loadCart() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  saveCart() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (e) {
      console.warn('Error saving cart', e);
    }
    this.notify();
  }

  loadCoupon() {
    try {
      const saved = localStorage.getItem(this.couponKey);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  saveCoupon(coupon) {
    this.appliedCoupon = coupon;
    if (coupon) {
      localStorage.setItem(this.couponKey, JSON.stringify(coupon));
    } else {
      localStorage.removeItem(this.couponKey);
    }
    this.notify();
  }

  loadDelivery() {
    try {
      const saved = localStorage.getItem(this.deliveryKey);
      return saved || 'upto5km';
    } catch (e) {
      return 'upto5km';
    }
  }

  setDeliveryOption(optionId) {
    this.selectedDelivery = optionId;
    try {
      localStorage.setItem(this.deliveryKey, optionId);
    } catch (e) {}
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    listener(this);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  addItem(product, quantity = 1) {
    const cartItemId = `cart_${product.id}`;
    const existingIndex = this.items.findIndex(item => item.cartItemId === cartItemId);

    if (existingIndex > -1) {
      this.items[existingIndex].quantity += quantity;
    } else {
      this.items.push({
        cartItemId,
        productId: product.id,
        code: product.code || '',
        name: product.name,
        category: product.category,
        categoryName: product.categoryName,
        subCategory: product.subCategory || '',
        image: product.image,
        unitPrice: product.price,
        mrp: product.mrp || product.price,
        gstRate: product.gstRate || 0,
        quantity: quantity
      });
    }

    this.saveCart();
    this.playChimeSound();
    return true;
  }

  updateQuantity(cartItemId, delta) {
    const item = this.items.find(i => i.cartItemId === cartItemId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      this.removeItem(cartItemId);
    } else {
      this.saveCart();
    }
  }

  removeItem(cartItemId) {
    this.items = this.items.filter(i => i.cartItemId !== cartItemId);
    this.saveCart();
  }

  clear() {
    this.items = [];
    this.saveCart();
  }

  getTotals() {
    const subtotal = this.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);

    let discount = 0;
    let couponMessage = '';

    if (this.appliedCoupon && subtotal > 0) {
      const couponRule = ACTIVE_COUPONS[this.appliedCoupon.code];
      if (couponRule) {
        if (subtotal < couponRule.minOrder) {
          couponMessage = `Minimum order ₹${couponRule.minOrder} required for ${this.appliedCoupon.code}`;
        } else {
          if (couponRule.discountPercent) {
            discount = Math.round((subtotal * couponRule.discountPercent) / 100);
            if (couponRule.maxDiscount) {
              discount = Math.min(discount, couponRule.maxDiscount);
            }
          } else if (couponRule.flatDiscount) {
            discount = couponRule.flatDiscount;
          }
        }
      }
    }

    // Delivery Fee logic as specified:
    // - Pick from store is free (₹0)
    // - Upto 5 Km is ₹50
    // - Upto 10 Km is ₹100
    let deliveryFee = 0;
    let deliveryLabel = "Pick from Store (Gorakhpur)";

    if (subtotal === 0) {
      deliveryFee = 0;
      deliveryLabel = "Cart is Empty";
    } else if (this.selectedDelivery === 'pickup') {
      deliveryFee = 0;
      deliveryLabel = "Pick from Store (Free)";
    } else if (this.selectedDelivery === 'upto10km') {
      if (this.appliedCoupon && ACTIVE_COUPONS[this.appliedCoupon.code]?.freeDelivery) {
        deliveryFee = 0;
        deliveryLabel = "Delivery Up to 10 Km (Free Promo)";
      } else {
        deliveryFee = 100;
        deliveryLabel = "Delivery Up to 10 Km (₹100)";
      }
    } else {
      // Default upto5km
      if (this.appliedCoupon && ACTIVE_COUPONS[this.appliedCoupon.code]?.freeDelivery) {
        deliveryFee = 0;
        deliveryLabel = "Delivery Up to 5 Km (Free Promo)";
      } else {
        deliveryFee = 50;
        deliveryLabel = "Delivery Up to 5 Km (₹50)";
      }
    }

    const netTaxable = Math.max(0, subtotal - discount);
    const gst = Math.round(netTaxable * this.gstRate);
    const grandTotal = Math.max(0, netTaxable + deliveryFee + gst);

    return {
      subtotal,
      itemCount,
      discount,
      couponMessage,
      selectedDelivery: this.selectedDelivery,
      deliveryLabel,
      deliveryFee,
      isFreeDelivery: deliveryFee === 0,
      gst,
      grandTotal,
      appliedCoupon: this.appliedCoupon
    };
  }

  applyCouponCode(code) {
    const upperCode = (code || '').trim().toUpperCase();
    if (!upperCode) return { success: false, message: 'Please enter a coupon code.' };

    const couponRule = ACTIVE_COUPONS[upperCode];
    if (!couponRule) {
      return { success: false, message: 'Invalid coupon code. Try SHALOM50 or KERALA10' };
    }

    const { subtotal } = this.getTotals();
    if (subtotal < couponRule.minOrder) {
      return {
        success: false,
        message: `Min order value of ₹${couponRule.minOrder} needed to apply ${upperCode}.`
      };
    }

    this.saveCoupon({ code: upperCode, ...couponRule });
    return { success: true, message: `Coupon "${upperCode}" applied! ${couponRule.desc}` };
  }

  removeCoupon() {
    this.saveCoupon(null);
  }

  playChimeSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }
}

// Global cart instance
const shalomCart = new ShalomCart();
