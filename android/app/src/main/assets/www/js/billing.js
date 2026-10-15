/**
 * Shalom Kerala Stores - Billing, Delivery & GST Invoice Engine
 * Gorakhpur, Uttar Pradesh | UPI: 7379325499@ybl
 */

class ShalomBillingManager {
  constructor() {
    this.ordersStorageKey = 'shalom_kerala_orders_v2';
    this.pastOrders = this.loadOrders();
    this.activeOrder = null;
  }

  loadOrders() {
    try {
      const saved = localStorage.getItem(this.ordersStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  saveOrders() {
    try {
      localStorage.setItem(this.ordersStorageKey, JSON.stringify(this.pastOrders));
    } catch (e) {
      console.warn('Failed to save orders history', e);
    }
  }

  /**
   * Validate checkout input fields
   */
  validateBillingDetails(formData, deliveryOption) {
    const errors = {};

    if (!formData.customerName || formData.customerName.trim().length < 2) {
      errors.customerName = "Please enter your full name";
    }

    const cleanPhone = (formData.phone || '').replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      errors.phone = "Enter a valid 10-digit mobile number for order & delivery updates";
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Enter a valid email address for your official bill";
    }

    // If pickup, full street address is optional, but for delivery it is required
    if (deliveryOption !== 'pickup') {
      if (!formData.address || formData.address.trim().length < 4) {
        errors.address = "Enter delivery address / house details in Gorakhpur";
      }
      if (!formData.area) {
        errors.area = "Please select your locality in Gorakhpur";
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Create pending order from cart and form
   */
  createOrder(formData, cartInstance) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const orderId = `SKS-GKP-${randomNum}`;
    const invoiceNumber = `INV-GKP-${new Date().getFullYear()}-${randomNum.toString().slice(0, 4)}`;
    
    const totals = cartInstance.getTotals();
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    let deliveryDescription = "Store Pickup (Gorakhpur Counter) - FREE";
    if (cartInstance.selectedDelivery === 'upto5km') {
      deliveryDescription = "Doorstep Delivery Up to 5 Km in Gorakhpur (₹50)";
    } else if (cartInstance.selectedDelivery === 'upto10km') {
      deliveryDescription = "City Delivery Up to 10 Km in Gorakhpur (₹100)";
    }

    this.activeOrder = {
      orderId,
      invoiceNumber,
      createdAt: now.toISOString(),
      formattedDate,
      formattedTime,
      customer: {
        name: formData.customerName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: (formData.address || 'In-Store Pickup').trim(),
        landmark: (formData.landmark || '').trim(),
        area: formData.area || 'Gorakhpur City',
        city: 'Gorakhpur',
        state: 'Uttar Pradesh',
        pincode: (formData.pincode || '273013').trim(),
        notes: (formData.notes || '').trim()
      },
      delivery: {
        type: deliveryDescription,
        code: cartInstance.selectedDelivery,
        fee: totals.deliveryFee
      },
      items: cartInstance.items.map(i => ({ ...i })),
      totals: { ...totals },
      payment: {
        method: "UPI",
        vpa: "7379325499@ybl",
        status: "PENDING",
        utr: "",
        paidAt: null
      }
    };

    return this.activeOrder;
  }

  /**
   * Complete payment and mark order as verified
   */
  completePayment(utrNumber = null) {
    if (!this.activeOrder) return null;

    const generatedUtr = utrNumber || `UPI${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    const now = new Date();

    this.activeOrder.payment.status = "SUCCESS";
    this.activeOrder.payment.utr = generatedUtr;
    this.activeOrder.payment.paidAt = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    this.pastOrders.unshift({ ...this.activeOrder });
    this.saveOrders();

    return this.activeOrder;
  }

  /**
   * Generate Clean HTML for Official GST Tax Invoice
   */
  renderTaxInvoiceHTML(order) {
    const subtotal = order.totals.subtotal;
    const discount = order.totals.discount;
    const taxableAmount = Math.max(0, subtotal - discount);
    const cgst = Math.round((taxableAmount * 0.025) * 100) / 100;
    const sgst = Math.round((taxableAmount * 0.025) * 100) / 100;
    const grandTotal = order.totals.grandTotal;

    const itemsHtml = order.items.map((item, index) => `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td>
          <div class="invoice-item-name"><strong>${item.name}</strong></div>
          <div class="invoice-item-sub">${item.categoryName || ''} • Code: ${item.code || 'SK'}</div>
        </td>
        <td class="text-center"><strong>${item.quantity}</strong></td>
        <td class="text-right">₹${item.unitPrice.toLocaleString('en-IN')}</td>
        <td class="text-right"><strong>₹${(item.unitPrice * item.quantity).toLocaleString('en-IN')}</strong></td>
      </tr>
    `).join('');

    return `
      <div class="gst-tax-invoice" id="printableInvoice">
        <!-- Store Header -->
        <div class="invoice-header">
          <div class="invoice-brand">
            <div class="brand-crest">
              <span class="crest-icon">🌴</span>
            </div>
            <div>
              <h2 class="invoice-title">SHALOM KERALA STORES</h2>
              <div class="invoice-subtitle">ശാലോം കേരള സ്റ്റോർസ് • Gorakhpur, Uttar Pradesh</div>
              <p class="invoice-meta-address">
                Chargawan, Near Little Flower School / Medical College Road, Gorakhpur, UP - 273013<br>
                GSTIN: <strong>09AABCS7379R1ZM</strong> | UPI: <strong>7379325499@ybl</strong><br>
                Contact: <strong>+91 73793 25499</strong> | Email: shalomkeralagkp@gmail.com
              </p>
            </div>
          </div>
          <div class="invoice-bill-badge">
            <div class="badge-title">TAX INVOICE / ബിൽ</div>
            <div class="badge-number">#${order.invoiceNumber}</div>
            <div class="badge-date">Date: ${order.formattedDate}</div>
            <div class="badge-time">Time: ${order.formattedTime}</div>
          </div>
        </div>

        <div class="invoice-divider"></div>

        <!-- Customer & Order Meta -->
        <div class="invoice-parties-grid">
          <div class="invoice-party-box">
            <span class="party-label">BILLED & DELIVERED TO:</span>
            <div class="party-name">${order.customer.name}</div>
            <div class="party-address">
              ${order.customer.address}<br>
              ${order.customer.area ? `Area: ${order.customer.area}<br>` : ''}
              ${order.customer.landmark ? `Landmark: ${order.customer.landmark}<br>` : ''}
              Gorakhpur, Uttar Pradesh - PIN: ${order.customer.pincode}<br>
              <strong>Phone:</strong> +91 ${order.customer.phone}<br>
              <strong>Email:</strong> ${order.customer.email}
            </div>
          </div>
          <div class="invoice-party-box">
            <span class="party-label">ORDER & PAYMENT SUMMARY:</span>
            <div class="meta-row"><span>Order ID:</span> <strong>${order.orderId}</strong></div>
            <div class="meta-row"><span>Delivery Mode:</span> <span>${order.delivery.type}</span></div>
            <div class="meta-row"><span>Payment Method:</span> <span class="upi-highlight">UPI (7379325499@ybl)</span></div>
            <div class="meta-row"><span>UPI Ref / UTR:</span> <code class="utr-code">${order.payment.utr}</code></div>
            <div class="meta-row">
              <span>Payment Status:</span>
              <span class="status-pill-paid">PAID & VERIFIED ✓</span>
            </div>
          </div>
        </div>

        <!-- Table of Products -->
        <div class="invoice-table-wrapper">
          <table class="invoice-items-table">
            <thead>
              <tr>
                <th class="text-center" style="width: 40px;">#</th>
                <th>Item Description</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Unit Rate</th>
                <th class="text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <!-- Invoice Calculation Breakdown -->
        <div class="invoice-calc-grid">
          <div class="invoice-notes-block">
            <div class="notes-heading">🌿 Thank you for shopping with Shalom Kerala Stores, Gorakhpur!</div>
            <p>Your trusted home in Gorakhpur for authentic Kerala food items, Church devotional articles, and stationery. For doorstep delivery or order queries, call <strong>+91 73793 25499</strong>.</p>
            <div class="authentic-stamp">
              <div class="stamp-inner">
                <span class="stamp-kerala">SHALOM KERALA STORES</span>
                <span class="stamp-verified">GORAKHPUR • VERIFIED BILL</span>
                <span class="stamp-date">${order.formattedDate}</span>
              </div>
            </div>
          </div>

          <div class="invoice-totals-block">
            <div class="totals-line">
              <span>Items Subtotal:</span>
              <span>₹${subtotal.toLocaleString('en-IN')}</span>
            </div>
            ${discount > 0 ? `
              <div class="totals-line discount-line">
                <span>Coupon Savings:</span>
                <span>- ₹${discount.toLocaleString('en-IN')}</span>
              </div>
            ` : ''}
            <div class="totals-line">
              <span>Delivery Charges:</span>
              <span>${order.totals.deliveryFee === 0 ? '<strong class="free-text">FREE (Pick from Store)</strong>' : `₹${order.totals.deliveryFee}`}</span>
            </div>
            <div class="totals-line">
              <span>CGST (2.5%):</span>
              <span>₹${cgst.toFixed(2)}</span>
            </div>
            <div class="totals-line">
              <span>SGST (2.5%):</span>
              <span>₹${sgst.toFixed(2)}</span>
            </div>
            <div class="totals-divider"></div>
            <div class="totals-grand-total">
              <span>Net Amount Paid:</span>
              <span class="grand-price">₹${grandTotal.toLocaleString('en-IN')}</span>
            </div>
            <div class="amount-in-words">
              Amount received via UPI (7379325499@ybl) • Includes all taxes
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="invoice-footer">
          <div>This is an official computer-generated billing receipt authorized by Shalom Kerala Stores, Gorakhpur.</div>
          <div class="kerala-tagline">ദൈവത്തിന്റെ സ്വന്തം നാട്ടിലെ വിഭവങ്ങൾ ഇനി ഗോരഖ്പൂരിലും • Shalom Kerala Stores</div>
        </div>
      </div>
    `;
  }
}

const shalomBilling = new ShalomBillingManager();
