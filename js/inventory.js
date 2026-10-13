/**
 * Shalom Kerala Stores - POS Billing Counter, Bill Book & Inventory ERP
 * Gorakhpur, Uttar Pradesh | 7379325499@ybl | 1,281 Items Master Catalog
 */

document.addEventListener('DOMContentLoaded', () => {
  // Storage Keys
  const STOCK_STORAGE_KEY = 'shalom_live_stock_v1';
  const POS_BILLS_STORAGE_KEY = 'shalom_pos_bills_v1';

  // Audio Context for Barcode Scanner Beep
  let audioCtx = null;
  function playScannerBeep() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1850, audioCtx.currentTime); // 1850 Hz crisp retail scanner pitch
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
      console.log('Scanner sound fallback', e);
    }
  }

  // Active Bill State
  let activeBill = {
    isEditing: false,
    editingBillNo: null,
    billNo: generateNextBillNumber(),
    timestamp: new Date().toISOString(),
    customerName: '',
    customerPhone: '',
    paymentMode: 'UPI',
    utrRef: '',
    discount: 0,
    gstMode: 'included', // 'none', 'included', 'extra'
    items: [] // { id, code, name, unitPrice, quantity, subtotal, unit }
  };

  // Stock Table State
  const stockState = {
    search: '',
    category: 'all',
    status: 'all',
    page: 1,
    pageSize: 100,
    selectedIds: new Set()
  };

  // Cache DOM Elements
  const el = {
    // Navigation Tabs
    tabPosBilling: document.getElementById('tabPosBilling'),
    tabBillHistory: document.getElementById('tabBillHistory'),
    tabStockMaster: document.getElementById('tabStockMaster'),
    tabOnlineOrders: document.getElementById('tabOnlineOrders'),
    posBillingView: document.getElementById('posBillingView'),
    billHistoryView: document.getElementById('billHistoryView'),
    stockMasterView: document.getElementById('stockMasterView'),
    onlineOrdersView: document.getElementById('onlineOrdersView'),
    onlineOrdersListContainer: document.getElementById('onlineOrdersListContainer'),
    onlineOrdersFilter: document.getElementById('onlineOrdersFilter'),
    refreshOnlineOrdersBtn: document.getElementById('refreshOnlineOrdersBtn'),
    pendingOrdersCountBadge: document.getElementById('pendingOrdersCountBadge'),
    onlineOrdersBadge: document.getElementById('onlineOrdersBadge'),

    // POS Billing Counter
    posBarcodeInput: document.getElementById('posBarcodeInput'),
    posScanForm: document.getElementById('posScanForm'),
    posScanSubmitBtn: document.getElementById('posScanSubmitBtn'),
    posItemSelect: document.getElementById('posItemSelect'),
    posManualAddBtn: document.getElementById('posManualAddBtn'),
    posBillTableBody: document.getElementById('posBillTableBody'),
    posItemsCountDisplay: document.getElementById('posItemsCountDisplay'),
    posClearBillBtn: document.getElementById('posClearBillBtn'),
    posBillNoText: document.getElementById('posBillNoText'),
    posBillModeBadge: document.getElementById('posBillModeBadge'),
    posLiveClock: document.getElementById('posLiveClock'),
    posEditModeBanner: document.getElementById('posEditModeBanner'),
    posEditingBillId: document.getElementById('posEditingBillId'),
    posCancelEditBtn: document.getElementById('posCancelEditBtn'),
    posCustomerName: document.getElementById('posCustomerName'),
    posCustomerPhone: document.getElementById('posCustomerPhone'),
    posPaymentModesGrid: document.getElementById('posPaymentModesGrid'),
    posUpiRefGroup: document.getElementById('posUpiRefGroup'),
    posUtrRef: document.getElementById('posUtrRef'),
    posDiscountInput: document.getElementById('posDiscountInput'),
    posGstToggle: document.getElementById('posGstToggle'),
    posSubtotalText: document.getElementById('posSubtotalText'),
    posDiscountRow: document.getElementById('posDiscountRow'),
    posDiscountText: document.getElementById('posDiscountText'),
    posGstRow: document.getElementById('posGstRow'),
    posGstText: document.getElementById('posGstText'),
    posGrandTotalText: document.getElementById('posGrandTotalText'),
    posPrintThermalBtn: document.getElementById('posPrintThermalBtn'),
    posSaveBillBtn: document.getElementById('posSaveBillBtn'),
    posPreviewThermalBtn: document.getElementById('posPreviewThermalBtn'),

    // Mobile Camera Scanner Elements
    posOpenMobileScannerBtn: document.getElementById('posOpenMobileScannerBtn'),
    posOpenWirelessConnectBtn: document.getElementById('posOpenWirelessConnectBtn'),
    mobileScannerModal: document.getElementById('mobileScannerModal'),
    closeMobileScannerBtn: document.getElementById('closeMobileScannerBtn'),
    mobileScannerFeedbackBanner: document.getElementById('mobileScannerFeedbackBanner'),
    mobileScannerStatusText: document.getElementById('mobileScannerStatusText'),
    mobileScanCountBadge: document.getElementById('mobileScanCountBadge'),
    lastScannedItemText: document.getElementById('lastScannedItemText'),
    lastScannedItemPrice: document.getElementById('lastScannedItemPrice'),
    flipCameraBtn: document.getElementById('flipCameraBtn'),
    continuousScanToggle: document.getElementById('continuousScanToggle'),
    doneMobileScanBtn: document.getElementById('doneMobileScanBtn'),

    // Wireless Phone Scanner Connection
    wirelessScannerModal: document.getElementById('wirelessScannerModal'),
    closeWirelessModalBtn: document.getElementById('closeWirelessModalBtn'),
    closeWirelessModalBottomBtn: document.getElementById('closeWirelessModalBottomBtn'),
    wirelessQrContainer: document.getElementById('wirelessQrContainer'),
    wirelessUrlDisplay: document.getElementById('wirelessUrlDisplay'),
    copyWirelessUrlBtn: document.getElementById('copyWirelessUrlBtn'),

    // 2-Inch Thermal Modal & Print
    receiptModalBackdrop: document.getElementById('receiptModalBackdrop'),
    closeReceiptModalBtn: document.getElementById('closeReceiptModalBtn'),
    thermalSlipPreview: document.getElementById('thermalSlipPreview'),
    modalPrintTriggerBtn: document.getElementById('modalPrintTriggerBtn'),
    printThermalWrapper: document.getElementById('printThermalWrapper'),

    // Bill Book History View
    histSearchInput: document.getElementById('histSearchInput'),
    histPaymentFilter: document.getElementById('histPaymentFilter'),
    histTotalBillsCount: document.getElementById('histTotalBillsCount'),
    histTotalRevenue: document.getElementById('histTotalRevenue'),
    histTableBody: document.getElementById('histTableBody'),

    // Stock Management View
    kpiTotalItems: document.getElementById('kpiTotalItems'),
    kpiInStock: document.getElementById('kpiInStock'),
    kpiLowStock: document.getElementById('kpiLowStock'),
    kpiOutStock: document.getElementById('kpiOutStock'),
    kpiCategories: document.getElementById('kpiCategories'),
    erpSearchInput: document.getElementById('erpSearchInput'),
    erpCategorySelect: document.getElementById('erpCategorySelect'),
    erpStatusTabs: document.getElementById('erpStatusTabs'),
    erpItemCountDisplay: document.getElementById('erpItemCountDisplay'),
    erpSaveStockBtn: document.getElementById('erpSaveStockBtn'),
    erpResetStockBtn: document.getElementById('erpResetStockBtn'),
    erpExportSyncBtn: document.getElementById('erpExportSyncBtn'),
    erpBarcodeSelectedBtn: document.getElementById('erpBarcodeSelectedBtn'),
    erpSelectedCountBadge: document.getElementById('erpSelectedCountBadge'),
    stockSelectAllPage: document.getElementById('stockSelectAllPage'),
    posBillBarcodeBtn: document.getElementById('posBillBarcodeBtn'),
    erpTableBody: document.getElementById('erpTableBody'),
    erpPaginationInfo: document.getElementById('erpPaginationInfo'),
    erpPrevPageBtn: document.getElementById('erpPrevPageBtn'),
    erpNextPageBtn: document.getElementById('erpNextPageBtn'),

    // Barcode Modal Elements (TEC-IT)
    barcodeModalBackdrop: document.getElementById('barcodeModalBackdrop'),
    closeBarcodeModalBtn: document.getElementById('closeBarcodeModalBtn'),
    closeBarcodeModalBottomBtn: document.getElementById('closeBarcodeModalBottomBtn'),
    barcodeLabelsContainer: document.getElementById('barcodeLabelsContainer'),
    barcodeModalSelectedCount: document.getElementById('barcodeModalSelectedCount'),
    printBarcodeSheetBtn: document.getElementById('printBarcodeSheetBtn'),
    openTecItDirectSiteBtn: document.getElementById('openTecItDirectSiteBtn'),
    barcodeLabelSizeSelect: document.getElementById('barcodeLabelSizeSelect'),
    printBarcodeWrapper: document.getElementById('printBarcodeWrapper'),

    // Toast Container
    erpToastContainer: document.getElementById('erpToastContainer'),

    // Cloud Sync Elements
    btnCloudSyncSettings: document.getElementById('btnCloudSyncSettings'),
    cloudStatusDot: document.getElementById('cloudStatusDot'),
    cloudStatusText: document.getElementById('cloudStatusText'),
    cloudSyncModalBackdrop: document.getElementById('cloudSyncModalBackdrop'),
    closeCloudSyncModalBtn: document.getElementById('closeCloudSyncModalBtn'),
    cloudModalStatusLabel: document.getElementById('cloudModalStatusLabel'),
    cloudFirebaseConfigTextarea: document.getElementById('cloudFirebaseConfigTextarea'),
    btnSaveCloudConfig: document.getElementById('btnSaveCloudConfig'),
    btnClearCloudConfig: document.getElementById('btnClearCloudConfig'),
    btnTestCloudConnection: document.getElementById('btnTestCloudConnection')
  };

  // =========================================================================
  // STORAGE HELPERS
  // =========================================================================

  function loadStockOverrides() {
    try {
      const saved = localStorage.getItem(STOCK_STORAGE_KEY);
      if (!saved) return;
      const overrides = JSON.parse(saved);
      SHALOM_PRODUCTS.forEach(p => {
        if (overrides[p.id] !== undefined) {
          p.stock = overrides[p.id];
          p.inStock = p.stock > 0;
        }
      });
    } catch (e) {
      console.warn('Failed to load stock overrides', e);
    }
  }

  function saveStockOverrides(showToastMsg = false) {
    try {
      const overrides = {};
      SHALOM_PRODUCTS.forEach(p => {
        overrides[p.id] = p.stock;
      });
      localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(overrides));
      if (showToastMsg) showToast('Live stock saved to storage!', 'success');
    } catch (e) {
      console.warn('Failed to save stock overrides', e);
    }
  }

  function loadSavedBills() {
    try {
      const saved = localStorage.getItem(POS_BILLS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Failed to load bills', e);
      return [];
    }
  }

  function saveBills(bills) {
    try {
      localStorage.setItem(POS_BILLS_STORAGE_KEY, JSON.stringify(bills));
    } catch (e) {
      console.warn('Failed to save bills', e);
    }
  }

  function generateNextBillNumber() {
    const bills = loadSavedBills();
    const count = bills.length + 1;
    const year = new Date().getFullYear();
    const pad = String(count).padStart(4, '0');
    return `SHALOM-POS-${year}-${pad}`;
  }

  // =========================================================================
  // POS BILLING COUNTER LOGIC
  // =========================================================================

  /**
   * Scan & Add Item
   */
  function handleBarcodeScan(inputVal) {
    const query = (inputVal || '').trim().toLowerCase();
    if (!query) return;

    // 1. Exact match on code/SKU
    let product = SHALOM_PRODUCTS.find(p => p.code.toLowerCase() === query || p.id.toLowerCase() === query);

    // 2. Exact match on name
    if (!product) {
      product = SHALOM_PRODUCTS.find(p => p.name.toLowerCase() === query);
    }

    // 3. Starts with code or contains code
    if (!product) {
      product = SHALOM_PRODUCTS.find(p => p.code.toLowerCase().includes(query));
    }

    // 4. Starts with name or contains name
    if (!product) {
      product = SHALOM_PRODUCTS.find(p => p.name.toLowerCase().includes(query));
    }

    if (product) {
      addItemToActiveBill(product);
      playScannerBeep();
      if (el.posBarcodeInput) {
        el.posBarcodeInput.value = '';
        el.posBarcodeInput.focus();
      }
    } else {
      showToast(`No item found matching "${query}"`, 'error');
      if (el.posBarcodeInput) el.posBarcodeInput.select();
    }
  }

  // =========================================================================
  // MOBILE CAMERA SCANNER & REMOTE WIRELESS SYNC ENGINE
  // =========================================================================

  let html5QrScanner = null;
  let isCameraScanning = false;
  let lastScannedCode = null;
  let lastScannedTime = 0;
  let currentCameraFacingMode = 'environment';
  let scannedSessionCount = 0;
  const scanSyncChannel = ('BroadcastChannel' in window) ? new BroadcastChannel('shalom_scanner_channel') : null;

  function broadcastScan(product) {
    try {
      if (scanSyncChannel) {
        scanSyncChannel.postMessage({ type: 'SCAN', code: product.code, name: product.name, timestamp: Date.now() });
      }
      localStorage.setItem('shalom_remote_scan_event', JSON.stringify({ code: product.code, name: product.name, timestamp: Date.now() }));
    } catch (e) {
      console.log(e);
    }
  }

  function initRemoteScanListeners() {
    if (scanSyncChannel) {
      scanSyncChannel.onmessage = (event) => {
        if (event.data && event.data.code) {
          handleBarcodeScan(event.data.code);
          showToast(`📱 Scanned from Phone: ${event.data.name || event.data.code}`, 'success');
        }
      };
    }

    window.addEventListener('storage', (e) => {
      if (e.key === 'shalom_remote_scan_event' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data && data.code && (Date.now() - data.timestamp) < 4000) {
            handleBarcodeScan(data.code);
            showToast(`📱 Scanned from Phone: ${data.name || data.code}`, 'success');
          }
        } catch (err) {}
      }
    });
  }

  async function openMobileScanner() {
    if (!el.mobileScannerModal) return;
    el.mobileScannerModal.classList.add('open');

    scannedSessionCount = 0;
    if (el.mobileScanCountBadge) el.mobileScanCountBadge.textContent = '0 Scanned';
    if (el.mobileScannerStatusText) el.mobileScannerStatusText.textContent = '📷 Starting mobile camera...';
    if (el.lastScannedItemText) el.lastScannedItemText.textContent = 'Ready to scan items...';
    if (el.lastScannedItemPrice) el.lastScannedItemPrice.textContent = '';

    try {
      if (typeof Html5Qrcode === 'undefined') {
        showToast('Camera library loading, please wait...', 'info');
        return;
      }

      if (html5QrScanner) {
        try {
          await html5QrScanner.stop();
          html5QrScanner.clear();
        } catch (e) {}
      }

      html5QrScanner = new Html5Qrcode("cameraStreamArea");

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.floor(minEdge * 0.75);
          return { width: boxSize, height: Math.floor(boxSize * 0.75) };
        },
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      await html5QrScanner.start(
        { facingMode: currentCameraFacingMode },
        config,
        onCameraScanSuccess,
        onCameraScanFailure
      );

      isCameraScanning = true;
      if (el.mobileScannerStatusText) el.mobileScannerStatusText.textContent = '📷 Camera Active — Aim at barcode';
      showToast('Mobile camera scanner started!', 'success');

    } catch (err) {
      console.warn('FacingMode camera start failed, trying device list fallback:', err);
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const selectedCam = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear') || c.label.toLowerCase().includes('environment')) || cameras[0];
          await html5QrScanner.start(
            selectedCam.id,
            { fps: 15, qrbox: { width: 240, height: 180 } },
            onCameraScanSuccess,
            onCameraScanFailure
          );
          isCameraScanning = true;
          if (el.mobileScannerStatusText) el.mobileScannerStatusText.textContent = '📷 Camera Active — Aim at barcode';
        } else {
          throw new Error('No camera devices available');
        }
      } catch (fallbackErr) {
        console.error('Camera access failed:', fallbackErr);
        if (el.mobileScannerStatusText) el.mobileScannerStatusText.textContent = '⚠️ Camera permission denied or not available';
        showToast('Please enable Camera permission in your browser to scan barcodes.', 'error');
      }
    }
  }

  function onCameraScanSuccess(decodedText) {
    if (!decodedText) return;
    const now = Date.now();

    // Debounce identical scans within 1.4s
    if (decodedText === lastScannedCode && (now - lastScannedTime) < 1400) {
      return;
    }

    lastScannedCode = decodedText;
    lastScannedTime = now;

    const query = decodedText.trim().toLowerCase();
    let product = SHALOM_PRODUCTS.find(p => p.code.toLowerCase() === query || p.id.toLowerCase() === query);
    if (!product) {
      product = SHALOM_PRODUCTS.find(p => p.name.toLowerCase() === query);
    }
    if (!product) {
      product = SHALOM_PRODUCTS.find(p => p.code.toLowerCase().includes(query));
    }
    if (!product) {
      product = SHALOM_PRODUCTS.find(p => p.name.toLowerCase().includes(query));
    }

    if (product) {
      addItemToActiveBill(product);
      playScannerBeep();
      broadcastScan(product);

      scannedSessionCount++;
      if (el.mobileScanCountBadge) el.mobileScanCountBadge.textContent = `${scannedSessionCount} Scanned`;
      if (el.lastScannedItemText) el.lastScannedItemText.textContent = `✓ Added: ${product.name}`;
      if (el.lastScannedItemPrice) el.lastScannedItemPrice.textContent = `₹${product.price}`;
      if (el.mobileScannerStatusText) el.mobileScannerStatusText.textContent = `✓ Scanned: ${product.name} (₹${product.price})`;

      // Reticle pulse
      const reticle = document.querySelector('.scanner-reticle-box');
      if (reticle) {
        reticle.style.borderColor = '#10b981';
        setTimeout(() => reticle.style.borderColor = 'rgba(212, 175, 55, 0.85)', 450);
      }

      if (el.continuousScanToggle && !el.continuousScanToggle.checked) {
        stopMobileScanner();
      }
    } else {
      if (el.mobileScannerStatusText) el.mobileScannerStatusText.textContent = `⚠️ Unrecognized code: ${decodedText}`;
      showToast(`Scanned "${decodedText}", but not found in Shalom catalog.`, 'error');
    }
  }

  function onCameraScanFailure(error) {
    // Continuous frame scanning callback - quiet ignore
  }

  async function stopMobileScanner() {
    if (html5QrScanner && isCameraScanning) {
      try {
        await html5QrScanner.stop();
        html5QrScanner.clear();
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
    }
    isCameraScanning = false;
    el.mobileScannerModal?.classList.remove('open');
  }

  async function flipCamera() {
    currentCameraFacingMode = (currentCameraFacingMode === 'environment') ? 'user' : 'environment';
    showToast(`Switching camera...`, 'info');
    if (isCameraScanning) {
      await stopMobileScanner();
      await openMobileScanner();
    }
  }

  function openWirelessConnectModal() {
    if (!el.wirelessScannerModal) return;
    el.wirelessScannerModal.classList.add('open');

    const port = window.location.port ? `:${window.location.port}` : '';
    let host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      host = '192.168.1.19'; // Local LAN IP
    }
    const wirelessUrl = `http://${host}${port}/inventory.html`;

    if (el.wirelessUrlDisplay) {
      el.wirelessUrlDisplay.textContent = wirelessUrl;
    }

    if (el.wirelessQrContainer) {
      el.wirelessQrContainer.innerHTML = '';
      if (typeof QRCode !== 'undefined') {
        new QRCode(el.wirelessQrContainer, {
          text: wirelessUrl,
          width: 170,
          height: 170,
          colorDark: "#03140e",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } else {
        el.wirelessQrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(wirelessUrl)}" alt="Scan on Phone" />`;
      }
    }
  }

  function closeWirelessConnectModal() {
    el.wirelessScannerModal?.classList.remove('open');
  }

  /**
   * Add Item to Active Bill
   */
  function addItemToActiveBill(product, qtyToAdd = 1) {
    const existing = activeBill.items.find(item => item.id === product.id);

    if (existing) {
      existing.quantity += qtyToAdd;
      existing.subtotal = existing.quantity * existing.unitPrice;
      showToast(`Incremented: ${product.name} (Qty: ${existing.quantity})`, 'info');
    } else {
      activeBill.items.push({
        id: product.id,
        code: product.code,
        name: product.name,
        unit: product.unit || 'Pack',
        unitPrice: Number(product.price) || 0,
        mrp: Number(product.mrp) || Number(product.price) || 0,
        quantity: qtyToAdd,
        subtotal: (Number(product.price) || 0) * qtyToAdd
      });
      showToast(`Added to bill: ${product.name}`, 'success');
    }

    renderActiveBillTable();
  }

  /**
   * Render Active Bill Table and Calculations
   */
  function renderActiveBillTable() {
    if (!el.posBillTableBody) return;

    if (activeBill.items.length === 0) {
      el.posBillTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">
            <div style="font-size: 2rem; margin-bottom: 6px;">🛒</div>
            <strong>Bill is empty</strong>
            <p style="font-size: 0.8rem; margin-top: 4px;">Scan barcode or select an item above to add to bill book.</p>
          </td>
        </tr>
      `;
    } else {
      el.posBillTableBody.innerHTML = activeBill.items.map((item, idx) => `
        <tr data-item-id="${item.id}">
          <td style="color: #5b6f65; font-weight: 700;">${idx + 1}</td>
          <td>
            <div class="bill-item-name">${item.name}</div>
            <div class="bill-item-sku">${item.code} • ${item.unit}</div>
          </td>
          <td style="text-align: right;">
            <input type="number" class="bill-rate-input item-rate-input" value="${item.unitPrice}" min="0" data-id="${item.id}" />
          </td>
          <td style="text-align: center;">
            <div class="bill-qty-control">
              <button type="button" class="bill-qty-btn btn-qty-dec" data-id="${item.id}">−</button>
              <input type="number" class="bill-qty-input item-qty-input" value="${item.quantity}" min="1" data-id="${item.id}" />
              <button type="button" class="bill-qty-btn btn-qty-inc" data-id="${item.id}">+</button>
            </div>
          </td>
          <td style="text-align: right; font-weight: 800; color: #06281e;">
            ₹${(item.unitPrice * item.quantity).toFixed(2)}
          </td>
          <td style="text-align: center;">
            <button type="button" class="bill-del-btn btn-del-item" data-id="${item.id}" title="Remove Item">✕</button>
          </td>
        </tr>
      `).join('');

      bindBillTableEvents();
    }

    // Update Counts & Meta
    if (el.posItemsCountDisplay) {
      el.posItemsCountDisplay.textContent = activeBill.items.reduce((s, it) => s + it.quantity, 0);
    }

    if (el.posBillNoText) el.posBillNoText.textContent = activeBill.billNo;
    
    if (el.posBillModeBadge) {
      if (activeBill.isEditing) {
        el.posBillModeBadge.textContent = '✏️ Edit Mode';
        el.posBillModeBadge.className = 'bill-mode-badge edit-mode';
        if (el.posEditModeBanner) el.posEditModeBanner.style.display = 'block';
        if (el.posEditingBillId) el.posEditingBillId.textContent = activeBill.editingBillNo;
      } else {
        el.posBillModeBadge.textContent = 'New Bill';
        el.posBillModeBadge.className = 'bill-mode-badge';
        if (el.posEditModeBanner) el.posEditModeBanner.style.display = 'none';
      }
    }

    calculateBillTotals();
  }

  function bindBillTableEvents() {
    // Quantity Decrement
    el.posBillTableBody.querySelectorAll('.btn-qty-dec').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const it = activeBill.items.find(x => x.id === id);
        if (it) {
          if (it.quantity > 1) {
            it.quantity--;
            it.subtotal = it.quantity * it.unitPrice;
          } else {
            activeBill.items = activeBill.items.filter(x => x.id !== id);
          }
          renderActiveBillTable();
        }
      });
    });

    // Quantity Increment
    el.posBillTableBody.querySelectorAll('.btn-qty-inc').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const it = activeBill.items.find(x => x.id === id);
        if (it) {
          it.quantity++;
          it.subtotal = it.quantity * it.unitPrice;
          renderActiveBillTable();
        }
      });
    });

    // Direct Quantity Change
    el.posBillTableBody.querySelectorAll('.item-qty-input').forEach(input => {
      input.addEventListener('change', () => {
        const id = input.getAttribute('data-id');
        const val = parseInt(input.value, 10);
        const it = activeBill.items.find(x => x.id === id);
        if (it) {
          if (!isNaN(val) && val > 0) {
            it.quantity = val;
            it.subtotal = it.quantity * it.unitPrice;
          } else {
            activeBill.items = activeBill.items.filter(x => x.id !== id);
          }
          renderActiveBillTable();
        }
      });
    });

    // Direct Rate Change
    el.posBillTableBody.querySelectorAll('.item-rate-input').forEach(input => {
      input.addEventListener('change', () => {
        const id = input.getAttribute('data-id');
        const val = parseFloat(input.value);
        const it = activeBill.items.find(x => x.id === id);
        if (it && !isNaN(val) && val >= 0) {
          it.unitPrice = val;
          it.subtotal = it.quantity * it.unitPrice;
          renderActiveBillTable();
        }
      });
    });

    // Delete item
    el.posBillTableBody.querySelectorAll('.btn-del-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        activeBill.items = activeBill.items.filter(x => x.id !== id);
        renderActiveBillTable();
        showToast('Item removed from bill', 'info');
      });
    });
  }

  /**
   * Calculate Bill Totals
   */
  function calculateBillTotals() {
    const subtotal = activeBill.items.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0);
    const discount = Math.max(0, parseFloat(el.posDiscountInput?.value || 0));
    const gstMode = el.posGstToggle?.value || 'included';

    let gstAmount = 0;
    let grandTotal = Math.max(0, subtotal - discount);

    if (gstMode === 'included') {
      // 5% included in rate
      gstAmount = grandTotal * (5 / 105);
    } else if (gstMode === 'extra') {
      // 5% added to subtotal
      gstAmount = grandTotal * 0.05;
      grandTotal += gstAmount;
    } else {
      gstAmount = 0;
    }

    if (el.posSubtotalText) el.posSubtotalText.textContent = `₹${subtotal.toFixed(2)}`;
    
    if (el.posDiscountRow && el.posDiscountText) {
      if (discount > 0) {
        el.posDiscountRow.style.display = 'flex';
        el.posDiscountText.textContent = `- ₹${discount.toFixed(2)}`;
      } else {
        el.posDiscountRow.style.display = 'none';
      }
    }

    if (el.posGstRow && el.posGstText) {
      if (gstMode === 'none') {
        el.posGstRow.style.display = 'none';
      } else {
        el.posGstRow.style.display = 'flex';
        el.posGstText.textContent = `₹${gstAmount.toFixed(2)} (${gstMode === 'included' ? 'Included' : '+5%'})`;
      }
    }

    if (el.posGrandTotalText) el.posGrandTotalText.textContent = `₹${grandTotal.toFixed(2)}`;

    return {
      subtotal,
      discount,
      gstAmount,
      grandTotal,
      gstMode
    };
  }

  /**
   * Save Active Bill into Bill Book & Decrement Inventory Stock
   */
  function saveCurrentBill(status = 'Paid') {
    if (activeBill.items.length === 0) {
      showToast('Bill is empty! Please scan or add items first.', 'error');
      return null;
    }

    const totals = calculateBillTotals();
    const customerName = (el.posCustomerName?.value || '').trim() || 'Walk-in Customer';
    const customerPhone = (el.posCustomerPhone?.value || '').trim();
    const utrRef = (el.posUtrRef?.value || '').trim();

    const bills = loadSavedBills();

    let finalizedBill = null;

    if (activeBill.isEditing && activeBill.editingBillNo) {
      // Find existing bill
      const idx = bills.findIndex(b => b.billNo === activeBill.editingBillNo);
      if (idx !== -1) {
        const oldBill = bills[idx];
        
        // 1. Restock old items
        oldBill.items.forEach(oldItem => {
          const p = SHALOM_PRODUCTS.find(prod => prod.id === oldItem.id);
          if (p) {
            p.stock += oldItem.quantity;
            p.inStock = p.stock > 0;
          }
        });

        // 2. Deduct new items
        activeBill.items.forEach(newItem => {
          const p = SHALOM_PRODUCTS.find(prod => prod.id === newItem.id);
          if (p) {
            p.stock = Math.max(0, p.stock - newItem.quantity);
            p.inStock = p.stock > 0;
          }
        });

        // Update record
        bills[idx] = {
          ...oldBill,
          customerName,
          customerPhone,
          paymentMode: activeBill.paymentMode,
          utrRef,
          discount: totals.discount,
          gstMode: totals.gstMode,
          subtotal: totals.subtotal,
          gstAmount: totals.gstAmount,
          grandTotal: totals.grandTotal,
          items: [...activeBill.items],
          status,
          updatedAt: new Date().toISOString()
        };

        finalizedBill = bills[idx];
        showToast(`Bill #${oldBill.billNo} updated successfully!`, 'success');
      }
    } else {
      // Deduct inventory stock for new bill
      activeBill.items.forEach(item => {
        const p = SHALOM_PRODUCTS.find(prod => prod.id === item.id);
        if (p) {
          p.stock = Math.max(0, p.stock - item.quantity);
          p.inStock = p.stock > 0;
        }
      });

      const now = new Date();
      finalizedBill = {
        billNo: activeBill.billNo,
        timestamp: now.toISOString(),
        formattedDate: now.toLocaleDateString('en-IN') + ' ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        customerName,
        customerPhone,
        paymentMode: activeBill.paymentMode,
        utrRef,
        discount: totals.discount,
        gstMode: totals.gstMode,
        subtotal: totals.subtotal,
        gstAmount: totals.gstAmount,
        grandTotal: totals.grandTotal,
        items: [...activeBill.items],
        status
      };

      bills.unshift(finalizedBill);
      showToast(`Saved Bill #${finalizedBill.billNo} (₹${finalizedBill.grandTotal.toFixed(2)})!`, 'success');
    }

    saveBills(bills);
    saveStockOverrides(false);
    updateKpis();
    renderStockTable();
    renderBillHistoryTable();

    return finalizedBill;
  }

  /**
   * Reset / Clear Active Bill
   */
  function resetActiveBill() {
    activeBill = {
      isEditing: false,
      editingBillNo: null,
      billNo: generateNextBillNumber(),
      timestamp: new Date().toISOString(),
      customerName: '',
      customerPhone: '',
      paymentMode: 'UPI',
      utrRef: '',
      discount: 0,
      gstMode: 'included',
      items: []
    };

    if (el.posCustomerName) el.posCustomerName.value = '';
    if (el.posCustomerPhone) el.posCustomerPhone.value = '';
    if (el.posUtrRef) el.posUtrRef.value = '';
    if (el.posDiscountInput) el.posDiscountInput.value = '0';
    if (el.posGstToggle) el.posGstToggle.value = 'included';
    if (el.posBarcodeInput) {
      el.posBarcodeInput.value = '';
      el.posBarcodeInput.focus();
    }

    // Set UPI active payment mode
    el.posPaymentModesGrid?.querySelectorAll('.pay-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === 'UPI');
    });

    renderActiveBillTable();
  }

  // =========================================================================
  // 2-INCH (58MM) THERMAL PRINTER FORMATTER & GENERATOR
  // =========================================================================

  /**
   * Generate 2-Inch Thermal Receipt HTML (Width: 54mm/58mm, 32 monospace chars per line)
   */
  function generate2InchThermalHTML(bill) {
    const divider = "--------------------------------";
    const doubleDivider = "================================";

    const dateStr = bill.formattedDate || (bill.timestamp ? new Date(bill.timestamp).toLocaleDateString('en-IN') + ' ' + new Date(bill.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleString('en-IN'));
    const items = Array.isArray(bill.items) ? bill.items : [];

    let itemsRows = items.map(it => {
      const uPrice = Number(it.unitPrice || it.price || 0);
      const qty = Number(it.quantity || 1);
      const lineTotal = (uPrice * qty).toFixed(2);
      const nameTruncated = (it.name || 'Item').length > 30 ? (it.name || 'Item').substring(0, 28) + '..' : (it.name || 'Item');
      return `
        <div style="font-weight: bold; margin-top: 4px;">${escapeHtml(nameTruncated)}</div>
        <div style="display: flex; justify-content: space-between; font-size: 10px;">
          <span>  ${qty} x Rs.${uPrice.toFixed(2)} (${escapeHtml(it.unit || '')})</span>
          <span style="font-weight: bold;">Rs.${lineTotal}</span>
        </div>
      `;
    }).join('');

    const totalQty = items.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
    const subtotal = Number(bill.subtotal || 0).toFixed(2);
    const grandTotal = Number(bill.grandTotal || 0).toFixed(2);
    const discount = Number(bill.discount || 0);
    const gstAmt = Number(bill.gstAmount || 0);

    return `
      <div style="text-align: center; font-size: 11px; line-height: 1.25;">
        <div style="font-size: 14px; font-weight: 900; letter-spacing: 0.5px;">SHALOM KERALA STORES</div>
        <div style="font-size: 9px; margin-top: 1px;">Chargawan, Near Little Flower School</div>
        <div style="font-size: 9px;">Medical College Road, Gorakhpur, UP</div>
        <div style="font-size: 9px; font-weight: bold;">Ph: +91 73793 25499 • UPI: 7379325499@ybl</div>
        <div style="margin: 4px 0;">${doubleDivider}</div>
        
        <div style="text-align: left; font-size: 10px;">
          <div style="display: flex; justify-content: space-between;">
            <span><strong>BILL NO:</strong> ${bill.billNo || 'DRAFT'}</span>
            <span><strong>${bill.status || 'PAID'}</strong></span>
          </div>
          <div>DATE: ${dateStr}</div>
          <div>CUSTOMER: ${escapeHtml(bill.customerName || 'Walk-in')}</div>
          ${bill.customerPhone ? `<div>PHONE   : ${escapeHtml(bill.customerPhone)}</div>` : ''}
        </div>

        <div style="margin: 4px 0;">${divider}</div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 10px;">
          <span>ITEM / QTY</span>
          <span>AMOUNT (Rs)</span>
        </div>
        <div style="margin: 4px 0;">${divider}</div>

        <div style="text-align: left;">
          ${itemsRows}
        </div>

        <div style="margin: 4px 0;">${divider}</div>

        <div style="font-size: 10px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Total Items: ${totalQty}</span>
            <span>Subtotal: Rs.${subtotal}</span>
          </div>
          ${discount > 0 ? `
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
              <span>Discount:</span>
              <span>- Rs.${discount.toFixed(2)}</span>
            </div>
          ` : ''}
          ${gstAmt > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>GST (5%):</span>
              <span>Rs.${gstAmt.toFixed(2)}</span>
            </div>
          ` : ''}
        </div>

        <div style="margin: 4px 0;">${doubleDivider}</div>

        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; padding: 2px 0;">
          <span>NET AMOUNT:</span>
          <span>Rs.${grandTotal}</span>
        </div>

        <div style="margin: 4px 0;">${doubleDivider}</div>

        <div style="text-align: left; font-size: 10px;">
          <div>PAID VIA: <strong>${bill.paymentMode || 'UPI'}</strong></div>
          ${bill.utrRef ? `<div>REF/UTR : ${escapeHtml(bill.utrRef)}</div>` : ''}
        </div>

        <div style="margin: 8px 0; border: 1px dashed #000; padding: 4px; font-size: 9px;">
          <strong>⚡ INSTANT UPI: 7379325499@ybl</strong><br>
          GPay / PhonePe / Paytm Accepted
        </div>

        <div style="font-size: 10px; font-weight: bold; margin-top: 6px;">
          ദൈവത്തിന്റെ സ്വന്തം നാട്
        </div>
        <div style="font-size: 9px; margin-top: 2px;">
          *** THANK YOU! VISIT AGAIN! ***
        </div>
        <div style="margin-top: 4px; font-size: 8px;">
          Goods once sold cannot be returned.
        </div>
        <div style="margin-top: 10px; font-size: 8px;">.</div>
      </div>
    `;
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Trigger 2-Inch Thermal Print
   */
  function print2InchThermalReceipt(bill) {
    const html = generate2InchThermalHTML(bill);

    // Populate dedicated off-screen print wrapper
    if (el.printThermalWrapper) {
      el.printThermalWrapper.innerHTML = html;
    }

    // Trigger window print
    window.print();
  }

  /**
   * Preview 2-Inch Thermal Receipt in Modal
   */
  function preview2InchThermalSlip(bill) {
    if (!el.thermalSlipPreview || !el.receiptModalBackdrop) return;
    el.thermalSlipPreview.innerHTML = generate2InchThermalHTML(bill);
    el.receiptModalBackdrop.classList.add('open');

    if (el.modalPrintTriggerBtn) {
      el.modalPrintTriggerBtn.onclick = () => {
        print2InchThermalReceipt(bill);
      };
    }
  }

  function closeReceiptModal() {
    el.receiptModalBackdrop?.classList.remove('open');
  }

  // =========================================================================
  // BILL BOOK HISTORY & EDIT
  // =========================================================================

  function renderBillHistoryTable() {
    if (!el.histTableBody) return;

    const bills = loadSavedBills();
    let filtered = bills;

    // Filter by Search
    const q = (el.histSearchInput?.value || '').trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(b => 
        b.billNo.toLowerCase().includes(q) ||
        (b.customerName && b.customerName.toLowerCase().includes(q)) ||
        (b.customerPhone && b.customerPhone.includes(q))
      );
    }

    // Filter by Payment Mode
    const mode = el.histPaymentFilter?.value || 'all';
    if (mode !== 'all') {
      filtered = filtered.filter(b => b.paymentMode === mode);
    }

    // Update Counts & Revenue
    if (el.histTotalBillsCount) el.histTotalBillsCount.textContent = bills.length;
    const totalRev = bills.reduce((sum, b) => b.status !== 'Cancelled' ? sum + Number(b.grandTotal) : sum, 0);
    if (el.histTotalRevenue) el.histTotalRevenue.textContent = `₹${totalRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    if (filtered.length === 0) {
      el.histTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: #6b7280;">
            <div style="font-size: 2rem; margin-bottom: 6px;">📋</div>
            <strong>No bills recorded yet</strong>
            <p style="font-size: 0.8rem; margin-top: 4px;">Saved POS customer bills and thermal receipts will appear here.</p>
          </td>
        </tr>
      `;
      return;
    }

    el.histTableBody.innerHTML = filtered.map(bill => {
      const itemsSummary = bill.items.map(it => `${it.name} (${it.quantity})`).join(', ');
      const isCancelled = bill.status === 'Cancelled';

      return `
        <tr data-bill-no="${bill.billNo}" style="${isCancelled ? 'opacity: 0.55; background: #fff5f5;' : ''}">
          <td style="font-family: monospace; font-weight: 800; color: #0c3c2e;">${bill.billNo}</td>
          <td style="font-size: 0.82rem; color: #5b6f65;">${bill.formattedDate || bill.timestamp.slice(0, 16)}</td>
          <td>
            <strong>${escapeHtml(bill.customerName)}</strong>
            ${bill.customerPhone ? `<div style="font-size: 0.74rem; color: #5b6f65;">📞 ${escapeHtml(bill.customerPhone)}</div>` : ''}
          </td>
          <td style="max-width: 260px; font-size: 0.78rem; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(itemsSummary)}">
            ${escapeHtml(itemsSummary)}
          </td>
          <td style="font-weight: 800; color: #06281e;">
            ₹${Number(bill.grandTotal).toFixed(2)}
          </td>
          <td>
            <span style="font-size: 0.74rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #eef5f1; border: 1px solid #cce2d5;">
              ${bill.paymentMode || 'UPI'}
            </span>
            ${isCancelled ? '<span style="font-size: 0.72rem; color: #dc2626; font-weight: bold; margin-left: 4px;">CANCELLED</span>' : ''}
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button type="button" class="btn btn-outline btn-sm btn-print-hist" data-bill-no="${bill.billNo}" title="Print 2-inch Thermal Slip">
              🖨️ Slip
            </button>
            <button type="button" class="btn btn-primary btn-sm btn-edit-hist" data-bill-no="${bill.billNo}" title="Edit this Bill">
              ✏️ Edit
            </button>
            <button type="button" class="btn btn-sm btn-del-hist" data-bill-no="${bill.billNo}" style="color: #dc2626; border: 1px solid #fecaca; background: #ffffff;" title="Cancel / Delete">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');

    bindHistoryTableEvents();
  }

  function bindHistoryTableEvents() {
    // Print Slip
    el.histTableBody.querySelectorAll('.btn-print-hist').forEach(btn => {
      btn.addEventListener('click', () => {
        const billNo = btn.getAttribute('data-bill-no');
        const bills = loadSavedBills();
        const found = bills.find(b => b.billNo === billNo);
        if (found) preview2InchThermalSlip(found);
      });
    });

    // Edit Bill
    el.histTableBody.querySelectorAll('.btn-edit-hist').forEach(btn => {
      btn.addEventListener('click', () => {
        const billNo = btn.getAttribute('data-bill-no');
        editExistingBill(billNo);
      });
    });

    // Delete / Cancel Bill
    el.histTableBody.querySelectorAll('.btn-del-hist').forEach(btn => {
      btn.addEventListener('click', () => {
        const billNo = btn.getAttribute('data-bill-no');
        cancelBillAndRestock(billNo);
      });
    });
  }

  /**
   * Load Previous Bill into Active Billing Screen for Editing
   */
  function editExistingBill(billNo) {
    const bills = loadSavedBills();
    const bill = bills.find(b => b.billNo === billNo);
    if (!bill) {
      showToast('Bill not found!', 'error');
      return;
    }

    activeBill = {
      isEditing: true,
      editingBillNo: bill.billNo,
      billNo: bill.billNo,
      timestamp: bill.timestamp,
      customerName: bill.customerName || '',
      customerPhone: bill.customerPhone || '',
      paymentMode: bill.paymentMode || 'UPI',
      utrRef: bill.utrRef || '',
      discount: bill.discount || 0,
      gstMode: bill.gstMode || 'included',
      items: bill.items.map(it => ({ ...it }))
    };

    // Populate UI inputs
    if (el.posCustomerName) el.posCustomerName.value = activeBill.customerName;
    if (el.posCustomerPhone) el.posCustomerPhone.value = activeBill.customerPhone;
    if (el.posUtrRef) el.posUtrRef.value = activeBill.utrRef;
    if (el.posDiscountInput) el.posDiscountInput.value = activeBill.discount;
    if (el.posGstToggle) el.posGstToggle.value = activeBill.gstMode;

    // Payment Mode buttons
    el.posPaymentModesGrid?.querySelectorAll('.pay-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === activeBill.paymentMode);
    });

    renderActiveBillTable();

    // Switch to POS Billing tab
    switchTab('posBillingView');

    showToast(`Loaded Bill #${bill.billNo} for editing. Modify items and save changes!`, 'info');
  }

  /**
   * Cancel Bill and Restock Items
   */
  function cancelBillAndRestock(billNo) {
    if (!confirm(`Are you sure you want to cancel Bill #${billNo} and restock items back into inventory?`)) {
      return;
    }

    const bills = loadSavedBills();
    const bill = bills.find(b => b.billNo === billNo);
    if (!bill) return;

    if (bill.status === 'Cancelled') {
      showToast('Bill is already cancelled.', 'info');
      return;
    }

    // Restock items
    bill.items.forEach(it => {
      const p = SHALOM_PRODUCTS.find(prod => prod.id === it.id);
      if (p) {
        p.stock += it.quantity;
        p.inStock = p.stock > 0;
      }
    });

    bill.status = 'Cancelled';
    saveBills(bills);
    saveStockOverrides(false);
    updateKpis();
    renderStockTable();
    renderBillHistoryTable();

    showToast(`Cancelled Bill #${billNo} and restored stock!`, 'success');
  }

  // =========================================================================
  // STOCK MANAGEMENT TABLE LOGIC (1,281 ITEMS)
  // =========================================================================

  function updateKpis() {
    let inStock = 0;
    let lowStock = 0;
    let outStock = 0;

    SHALOM_PRODUCTS.forEach(p => {
      if (p.stock <= 0) outStock++;
      else if (p.stock <= 2) lowStock++;
      else inStock++;
    });

    if (el.kpiTotalItems) el.kpiTotalItems.textContent = SHALOM_PRODUCTS.length.toLocaleString('en-IN');
    if (el.kpiInStock) el.kpiInStock.textContent = inStock.toLocaleString('en-IN');
    if (el.kpiLowStock) el.kpiLowStock.textContent = lowStock.toLocaleString('en-IN');
    if (el.kpiOutStock) el.kpiOutStock.textContent = outStock.toLocaleString('en-IN');
    if (el.kpiCategories) el.kpiCategories.textContent = SHALOM_CATEGORIES.length;

    // Update Tab labels
    if (el.erpStatusTabs) {
      const allTab = el.erpStatusTabs.querySelector('[data-status="all"]');
      const inTab = el.erpStatusTabs.querySelector('[data-status="in"]');
      const lowTab = el.erpStatusTabs.querySelector('[data-status="low"]');
      const outTab = el.erpStatusTabs.querySelector('[data-status="out"]');

      if (allTab) allTab.textContent = `All (${SHALOM_PRODUCTS.length})`;
      if (inTab) inTab.textContent = `In Stock (${inStock})`;
      if (lowTab) lowTab.textContent = `Low Stock (${lowStock})`;
      if (outTab) outTab.textContent = `Out of Stock (${outStock})`;
    }
  }

  function populateCategoryDropdown() {
    if (!el.erpCategorySelect) return;
    el.erpCategorySelect.innerHTML = '<option value="all">All 18 Categories (1,281 Items)</option>' +
      SHALOM_CATEGORIES.map(cat => `<option value="${cat.id}">${cat.name} (${cat.totalCount})</option>`).join('');
  }

  function populatePosItemSelect() {
    if (!el.posItemSelect) return;
    el.posItemSelect.innerHTML = '<option value="">-- Search & Select Item from Store Catalog --</option>' +
      SHALOM_PRODUCTS.map(p => `
        <option value="${p.id}">
          ${p.code} • ${p.name} (₹${p.price}) [Stock: ${p.stock}]
        </option>
      `).join('');
  }

  function getFilteredStockProducts() {
    let result = SHALOM_PRODUCTS;

    if (stockState.category !== 'all') {
      result = result.filter(p => p.category === stockState.category);
    }

    if (stockState.status === 'in') {
      result = result.filter(p => p.stock > 2);
    } else if (stockState.status === 'low') {
      result = result.filter(p => p.stock > 0 && p.stock <= 2);
    } else if (stockState.status === 'out') {
      result = result.filter(p => p.stock <= 0);
    }

    if (stockState.search) {
      const q = stockState.search.toLowerCase().trim();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.subCategory.toLowerCase().includes(q)
      );
    }

    return result;
  }

  function renderStockTable() {
    if (!el.erpTableBody) return;

    const filtered = getFilteredStockProducts();
    const totalFiltered = filtered.length;
    const totalPages = Math.ceil(totalFiltered / stockState.pageSize) || 1;

    if (stockState.page > totalPages) stockState.page = totalPages;
    if (stockState.page < 1) stockState.page = 1;

    const startIdx = (stockState.page - 1) * stockState.pageSize;
    const endIdx = Math.min(startIdx + stockState.pageSize, totalFiltered);
    const pageItems = filtered.slice(startIdx, endIdx);

    if (el.erpItemCountDisplay) {
      el.erpItemCountDisplay.textContent = totalFiltered === 0 
        ? 'No matching items' 
        : `Showing items ${startIdx + 1} to ${endIdx} of ${totalFiltered} filtered (Total 1,281)`;
    }

    if (el.erpPaginationInfo) {
      el.erpPaginationInfo.textContent = `Page ${stockState.page} of ${totalPages} • Total ${totalFiltered} items`;
    }

    if (el.erpPrevPageBtn) el.erpPrevPageBtn.disabled = (stockState.page <= 1);
    if (el.erpNextPageBtn) el.erpNextPageBtn.disabled = (stockState.page >= totalPages);

    if (totalFiltered === 0) {
      el.erpTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 40px; color: #6b7280;">
            <strong>No matching items found</strong>
          </td>
        </tr>
      `;
      return;
    }

    el.erpTableBody.innerHTML = pageItems.map(p => {
      let statusClass = 'erp-status-in';
      let statusLabel = 'In Stock';
      if (p.stock <= 0) {
        statusClass = 'erp-status-out';
        statusLabel = 'Out of Stock';
      } else if (p.stock <= 2) {
        statusClass = 'erp-status-low';
        statusLabel = 'Low Stock';
      }

      const isSelected = stockState.selectedIds.has(p.id);

      return `
        <tr data-prod-id="${p.id}" style="${isSelected ? 'background-color: #f7fbf8;' : ''}">
          <td style="text-align: center;">
            <input type="checkbox" class="stock-item-chk" data-id="${p.id}" ${isSelected ? 'checked' : ''} style="width: 17px; height: 17px; cursor: pointer;" title="Select item for barcode generation" />
          </td>
          <td style="font-family: monospace; font-size: 0.82rem; color: #5b6f65; font-weight: 700;">${p.code}</td>
          <td>
            <div style="font-weight: 700; color: #06281e;">${p.name}</div>
            <div style="font-size: 0.74rem; color: #5b6f65;">${p.subCategory}</div>
          </td>
          <td>
            <span style="font-size: 0.76rem; font-weight: 600; padding: 3px 8px; border-radius: 6px; background: #f0f6f2; border: 1px solid #d4e5dc;">
              ${p.categoryName}
            </span>
          </td>
          <td style="font-size: 0.8rem; color: #5b6f65; font-weight: 600;">${p.unit || 'Pack'}</td>
          <td>
            <strong style="color: #06281e;">₹${p.price}</strong>
            ${p.mrp > p.price ? `<span style="font-size: 0.72rem; text-decoration: line-through; color: #8a9c93; margin-left: 4px;">₹${p.mrp}</span>` : ''}
          </td>
          <td>
            <div style="display: inline-flex; align-items: center; gap: 4px; background: #f7faf8; border: 1.5px solid #d4e5dc; border-radius: 8px; padding: 2px 4px;">
              <button type="button" class="btn-stock-dec" data-id="${p.id}" style="width: 24px; height: 24px; border: none; background: #ffffff; font-weight: 800; cursor: pointer; border-radius: 4px;">−</button>
              <input type="number" class="stock-num-input" value="${p.stock}" min="0" data-id="${p.id}" style="width: 44px; text-align: center; border: none; background: transparent; font-weight: 800; outline: none;" />
              <button type="button" class="btn-stock-inc" data-id="${p.id}" style="width: 24px; height: 24px; border: none; background: #ffffff; font-weight: 800; cursor: pointer; border-radius: 4px;">+</button>
            </div>
            <button type="button" class="btn-preset-stock" data-id="${p.id}" data-val="0" style="padding: 2px 6px; font-size: 0.72rem; border: 1px solid #d4e5dc; background: #ffffff; cursor: pointer; border-radius: 4px; margin-left: 2px;">0</button>
            <button type="button" class="btn-preset-stock" data-id="${p.id}" data-val="5" style="padding: 2px 6px; font-size: 0.72rem; border: 1px solid #d4e5dc; background: #ffffff; cursor: pointer; border-radius: 4px;">5</button>
            <button type="button" class="btn-preset-stock" data-id="${p.id}" data-val="10" style="padding: 2px 6px; font-size: 0.72rem; border: 1px solid #d4e5dc; background: #ffffff; cursor: pointer; border-radius: 4px;">10</button>
          </td>
          <td>
            <span class="erp-status-badge ${statusClass}">
              <span>●</span>
              <span>${statusLabel}</span>
            </span>
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn btn-outline btn-sm btn-item-barcode" data-id="${p.id}" style="padding: 4px 8px; font-size: 0.74rem; font-weight: 700; border-color: #d4af37; color: #785a00;" title="Generate Code 128 Barcode via TEC-IT">
              🏷️ Barcode
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Synchronize Master Select-All checkbox
    if (el.stockSelectAllPage) {
      el.stockSelectAllPage.checked = (pageItems.length > 0 && pageItems.every(p => stockState.selectedIds.has(p.id)));
    }
    if (el.erpSelectedCountBadge) {
      el.erpSelectedCountBadge.textContent = stockState.selectedIds.size;
    }

    bindStockTableEvents(pageItems);
  }

  function bindStockTableEvents(pageItems = []) {
    // Checkbox selection
    el.erpTableBody.querySelectorAll('.stock-item-chk').forEach(chk => {
      chk.addEventListener('change', () => {
        const id = chk.getAttribute('data-id');
        if (chk.checked) {
          stockState.selectedIds.add(id);
        } else {
          stockState.selectedIds.delete(id);
        }
        if (el.erpSelectedCountBadge) {
          el.erpSelectedCountBadge.textContent = stockState.selectedIds.size;
        }
        if (el.stockSelectAllPage && pageItems.length > 0) {
          el.stockSelectAllPage.checked = pageItems.every(p => stockState.selectedIds.has(p.id));
        }
        const row = chk.closest('tr');
        if (row) {
          row.style.backgroundColor = chk.checked ? '#f7fbf8' : '';
        }
      });
    });

    // Single item barcode button
    el.erpTableBody.querySelectorAll('.btn-item-barcode').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const p = SHALOM_PRODUCTS.find(x => x.id === id);
        if (p) {
          openBarcodeModal([p]);
        }
      });
    });

    el.erpTableBody.querySelectorAll('.btn-stock-dec').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const p = SHALOM_PRODUCTS.find(x => x.id === id);
        if (p && p.stock > 0) {
          p.stock--;
          p.inStock = p.stock > 0;
          saveStockOverrides(false);
          updateKpis();
          renderStockTable();
        }
      });
    });

    el.erpTableBody.querySelectorAll('.btn-stock-inc').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const p = SHALOM_PRODUCTS.find(x => x.id === id);
        if (p) {
          p.stock++;
          p.inStock = true;
          saveStockOverrides(false);
          updateKpis();
          renderStockTable();
        }
      });
    });

    el.erpTableBody.querySelectorAll('.btn-preset-stock').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const val = parseInt(btn.getAttribute('data-val'), 10);
        const p = SHALOM_PRODUCTS.find(x => x.id === id);
        if (p) {
          p.stock = val;
          p.inStock = val > 0;
          saveStockOverrides(false);
          updateKpis();
          renderStockTable();
          showToast(`${p.name} stock set to ${val}`, 'success');
        }
      });
    });

    el.erpTableBody.querySelectorAll('.stock-num-input').forEach(input => {
      input.addEventListener('change', () => {
        const id = input.getAttribute('data-id');
        const val = parseInt(input.value, 10);
        const p = SHALOM_PRODUCTS.find(x => x.id === id);
        if (p && !isNaN(val) && val >= 0) {
          p.stock = val;
          p.inStock = val > 0;
          saveStockOverrides(false);
          updateKpis();
          renderStockTable();
          showToast(`${p.name} stock updated to ${val}`, 'success');
        }
      });
    });
  }

  function exportOrdersForExcelSync() {
    const bills = loadSavedBills();
    if (!bills || bills.length === 0) {
      showToast('No bills recorded yet to export.', 'info');
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bills, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `shalom_orders_sync_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();

    showToast(`Exported ${bills.length} bill(s) for SHALOM.xlsx sync!`, 'success');
  }

  // =========================================================================
  // CODE 128 BARCODE GENERATION & TEC-IT INTEGRATION
  // =========================================================================

  /**
   * Pure vector SVG Code 128 (Subset B) generator for 100% offline reliability
   */
  function generateCode128SVG(text, height = 48) {
    const patterns = [
      "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
      "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
      "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
      "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
      "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
      "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
      "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
      "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
      "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
      "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
      "114131","311141","411131","211412","211214","211232","2331112"
    ];

    const clean = String(text || '').trim();
    if (!clean) return '';

    let checksum = 104;
    const sequence = [patterns[104]];

    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i) - 32;
      const val = (code >= 0 && code <= 95) ? code : 0;
      checksum += val * (i + 1);
      sequence.push(patterns[val]);
    }

    const checkDigit = checksum % 103;
    sequence.push(patterns[checkDigit]);
    sequence.push(patterns[106]);

    const patternStr = sequence.join('');
    let x = 6;
    const barWidth = 1.7;
    let rects = '';

    for (let i = 0; i < patternStr.length; i++) {
      const width = parseInt(patternStr[i], 10) * barWidth;
      if (i % 2 === 0) {
        rects += `<rect x="${x}" y="0" width="${width}" height="${height}" fill="#000000" />`;
      }
      x += width;
    }

    const totalWidth = x + 6;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" style="max-width: 100%; height: ${height}px; display: block; margin: 0 auto;">${rects}</svg>`;
  }

  /**
   * Open Barcode Modal with selected products
   * Powered by https://barcode.tec-it.com/en/Code128
   */
  function openBarcodeModal(products) {
    if (!products || products.length === 0) {
      showToast('Please select at least 1 item to generate barcodes.', 'info');
      return;
    }

    if (!el.barcodeModalBackdrop || !el.barcodeLabelsContainer) return;

    if (el.barcodeModalSelectedCount) {
      el.barcodeModalSelectedCount.textContent = products.length;
    }

    if (el.openTecItDirectSiteBtn) {
      el.openTecItDirectSiteBtn.href = products.length === 1
        ? `https://barcode.tec-it.com/en/Code128?data=${encodeURIComponent(products[0].code)}`
        : `https://barcode.tec-it.com/en/Code128`;
    }

    el.barcodeLabelsContainer.innerHTML = products.map(p => {
      const tecItImageUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(p.code)}&code=Code128&translate-esc=on`;
      const tecItSiteUrl = `https://barcode.tec-it.com/en/Code128?data=${encodeURIComponent(p.code)}`;

      return `
        <div class="barcode-label-card" data-sku="${p.code}" data-id="${p.id}">
          <div class="barcode-store-tag">🌴 Shalom Kerala Stores • GKP</div>
          <div class="barcode-item-title" title="${p.name}">${p.name}</div>
          <div class="barcode-item-meta">${p.categoryName} • ${p.unit || 'Pack'}</div>
          
          <div class="barcode-img-box" id="barcode-box-${p.id}">
            <img 
              src="${tecItImageUrl}" 
              alt="Code 128 Barcode for ${p.code}" 
              loading="lazy" 
              onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';"
            />
            <div style="display: none; width: 100%;">
              ${generateCode128SVG(p.code, 46)}
            </div>
            <div class="barcode-human-code">* ${p.code} *</div>
          </div>

          <div class="barcode-price-tag">₹${p.price}</div>

          <div class="barcode-card-actions">
            <a href="${tecItSiteUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="background: #ffffff; border-color: #d4af37; color: #785a00; font-weight: 700;" title="Open and customize on https://barcode.tec-it.com/en/Code128">
              🌐 TEC-IT
            </a>
            <button type="button" class="btn btn-primary btn-sm btn-print-single-label" data-id="${p.id}" style="background: #0c3c2e; color: #ffffff;" title="Print label for this product">
              🖨️ Print
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Single label print buttons
    el.barcodeLabelsContainer.querySelectorAll('.btn-print-single-label').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const prod = products.find(x => x.id === id);
        if (prod) printBarcodeSheet([prod]);
      });
    });

    el.barcodeModalBackdrop.classList.add('open');
  }

  function closeBarcodeModal() {
    el.barcodeModalBackdrop?.classList.remove('open');
  }

  /**
   * Print Barcode Labels Sheet
   */
  function printBarcodeSheet(products) {
    if (!products || products.length === 0) return;
    if (!el.printBarcodeWrapper) return;

    el.printBarcodeWrapper.innerHTML = products.map(p => {
      const tecItImageUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(p.code)}&code=Code128&translate-esc=on`;
      return `
        <div class="print-barcode-sticker">
          <div style="font-size: 8px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Shalom Kerala Stores • Gorakhpur</div>
          <div style="font-size: 9.5px; font-weight: 800; margin: 2px 0; max-height: 24px; overflow: hidden;">${p.name}</div>
          <div style="font-size: 8px; color: #333;">${p.categoryName} • ₹${p.price}</div>
          <div style="margin: 4px 0;">
            <img src="${tecItImageUrl}" style="max-width: 100%; height: 38px; object-fit: contain;" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';" />
            <div style="display: none; width: 100%;">
              ${generateCode128SVG(p.code, 38)}
            </div>
          </div>
          <div style="font-family: monospace; font-size: 9px; font-weight: 700; letter-spacing: 1px;">* ${p.code} *</div>
        </div>
      `;
    }).join('');

    document.body.classList.add('printing-barcodes');
    window.print();

    window.addEventListener('afterprint', () => {
      document.body.classList.remove('printing-barcodes');
    }, { once: true });
  }

  // =========================================================================
  // VIEW TABS CONTROLLER
  // =========================================================================

  function switchTab(viewId) {
    // Buttons
    el.tabPosBilling?.classList.toggle('active', viewId === 'posBillingView');
    el.tabBillHistory?.classList.toggle('active', viewId === 'billHistoryView');
    el.tabStockMaster?.classList.toggle('active', viewId === 'stockMasterView');
    el.tabOnlineOrders?.classList.toggle('active', viewId === 'onlineOrdersView');

    // Views
    el.posBillingView?.classList.toggle('active', viewId === 'posBillingView');
    el.billHistoryView?.classList.toggle('active', viewId === 'billHistoryView');
    el.stockMasterView?.classList.toggle('active', viewId === 'stockMasterView');
    el.onlineOrdersView?.classList.toggle('active', viewId === 'onlineOrdersView');

    if (viewId === 'posBillingView') {
      setTimeout(() => el.posBarcodeInput?.focus(), 100);
    } else if (viewId === 'billHistoryView') {
      renderBillHistoryTable();
    } else if (viewId === 'stockMasterView') {
      renderStockTable();
    } else if (viewId === 'onlineOrdersView') {
      renderOnlineOrders();
    }
  }

  // =========================================================================
  // ONLINE ORDERS & VERIFICATION ENGINE
  // =========================================================================

  function renderOnlineOrders() {
    if (!el.onlineOrdersListContainer) return;
    const filter = el.onlineOrdersFilter?.value || 'pending';
    let orders = (typeof shalomOrderQueue !== 'undefined') ? shalomOrderQueue.getOrders() : [];

    // Update pending badge
    const pendingOrders = orders.filter(o => o.status === 'PENDING');
    if (el.pendingOrdersCountBadge) {
      el.pendingOrdersCountBadge.textContent = pendingOrders.length;
      el.pendingOrdersCountBadge.style.display = pendingOrders.length > 0 ? 'inline-block' : 'none';
    }
    if (el.onlineOrdersBadge) {
      el.onlineOrdersBadge.textContent = `${pendingOrders.length} Pending`;
    }

    if (filter === 'pending') {
      orders = pendingOrders;
    } else if (filter === 'confirmed') {
      orders = orders.filter(o => o.status === 'CONFIRMED');
    }

    if (orders.length === 0) {
      el.onlineOrdersListContainer.innerHTML = `
        <div style="text-align: center; padding: 48px 20px; background: #ffffff; border-radius: 12px; border: 1px dashed #d4e5dc;">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">🛎️</div>
          <strong style="color: #0c3c2e; font-size: 1.05rem;">No ${filter === 'pending' ? 'Pending' : ''} Online Orders</strong>
          <p style="font-size: 0.82rem; color: #5b6f65; margin: 4px 0 0 0;">
            When customers place orders on the storefront (index.html), they appear here instantly for confirmation.
          </p>
        </div>
      `;
      return;
    }

    el.onlineOrdersListContainer.innerHTML = orders.map(order => {
      const isPending = order.status === 'PENDING';
      const isConfirmed = order.status === 'CONFIRMED';

      const statusBadge = isPending 
        ? `<span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 20px; font-weight: 800; font-size: 0.74rem;">⏳ PENDING STORE CONFIRMATION</span>`
        : (isConfirmed 
            ? `<span style="background: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 20px; font-weight: 800; font-size: 0.74rem;">✅ CONFIRMED & BILLED (Bill #${order.billNo || ''})</span>`
            : `<span style="background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 20px; font-weight: 800; font-size: 0.74rem;">❌ CANCELLED</span>`);

      const cleanPhone = (order.customer?.phone || '').replace(/\D/g, '');
      const waLink = `https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(order.customer?.name || '')},%20regarding%20your%20Shalom%20Kerala%20Stores%20order%20${order.orderId}:`;

      return `
        <div class="online-order-card" style="background: #ffffff; border: 1.5px solid ${isPending ? '#d4af37' : '#e2ebe5'}; border-radius: 14px; padding: 20px; box-shadow: 0 4px 14px rgba(6, 40, 30, 0.05);">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; border-bottom: 1px solid #edf3ef; padding-bottom: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <strong style="font-size: 1.05rem; color: #0c3c2e;">${order.orderId}</strong>
                ${statusBadge}
              </div>
              <div style="font-size: 0.76rem; color: #5b6f65; margin-top: 4px;">
                Placed: ${order.submittedAt ? new Date(order.submittedAt).toLocaleString('en-IN') : order.createdAt}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1.3rem; font-weight: 800; color: #06281e;">₹${(order.totals?.grandTotal || 0).toLocaleString('en-IN')}</div>
              <div style="font-size: 0.74rem; color: #5b6f65;">UPI: 7379325499@ybl</div>
            </div>
          </div>

          <!-- Customer & Delivery Info -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-bottom: 16px; background: #fbfdfc; padding: 12px 14px; border-radius: 10px; border: 1px solid #eef5f1;">
            <div>
              <div style="font-size: 0.72rem; color: #5b6f65; font-weight: 700; text-transform: uppercase;">Customer Details</div>
              <div style="font-weight: 800; color: #16231d; font-size: 0.95rem; margin-top: 2px;">${order.customer?.name || 'Customer'}</div>
              <div style="font-size: 0.82rem; color: #0c3c2e; margin-top: 2px;">
                📞 <strong>${order.customer?.phone || 'N/A'}</strong>
                <a href="${waLink}" target="_blank" style="margin-left: 8px; color: #25D366; text-decoration: none; font-weight: 700;">💬 WhatsApp</a>
              </div>
            </div>
            <div>
              <div style="font-size: 0.72rem; color: #5b6f65; font-weight: 700; text-transform: uppercase;">Delivery Mode & Address</div>
              <div style="font-weight: 800; color: #0c3c2e; font-size: 0.88rem; margin-top: 2px;">${order.delivery?.type || 'Pickup'}</div>
              <div style="font-size: 0.8rem; color: #5b6f65; margin-top: 2px;">
                ${order.customer?.address || ''} ${order.customer?.area ? ', ' + order.customer.area : ''}
              </div>
              ${order.customer?.landmark ? `<div style="font-size: 0.76rem; color: #7d998d;">Landmark: ${order.customer.landmark}</div>` : ''}
            </div>
          </div>

          <!-- Items Table -->
          <div style="margin-bottom: 16px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.84rem;">
              <thead>
                <tr style="background: #f0f4f2; color: #0c3c2e; text-align: left;">
                  <th style="padding: 6px 10px;">Item</th>
                  <th style="padding: 6px 10px; text-align: center;">Qty</th>
                  <th style="padding: 6px 10px; text-align: right;">Unit Price</th>
                  <th style="padding: 6px 10px; text-align: right;">Total</th>
                </tr>
              </thead>
                ${(order.items || []).map(it => {
                  const uPrice = Number(it.unitPrice || it.price || 0);
                  const qty = Number(it.quantity || 1);
                  return `
                  <tr style="border-bottom: 1px solid #f0f4f2;">
                    <td style="padding: 7px 10px;"><strong>${escapeHtml(it.name || 'Item')}</strong> <span style="font-size: 0.74rem; color: #7d998d;">(${escapeHtml(it.code || 'SK')})</span></td>
                    <td style="padding: 7px 10px; text-align: center; font-weight: 700;">${qty}</td>
                    <td style="padding: 7px 10px; text-align: right;">₹${uPrice.toLocaleString('en-IN')}</td>
                    <td style="padding: 7px 10px; text-align: right; font-weight: 800;">₹${(uPrice * qty).toLocaleString('en-IN')}</td>
                  </tr>
                `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Actions -->
          <div style="display: flex; justify-content: flex-end; gap: 10px; align-items: center; border-top: 1px solid #edf3ef; padding-top: 14px;">
            ${isPending ? `
              <button type="button" class="btn btn-outline btn-sm reject-online-order-btn" data-order-id="${order.orderId}" style="border-color: #ef4444; color: #ef4444; cursor: pointer;">
                ✕ Reject Order
              </button>
              <button type="button" class="btn btn-primary confirm-online-order-btn" data-order-id="${order.orderId}" style="background: linear-gradient(135deg, #1d7057, #0c3c2e); font-weight: 800; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                <span>✓ Confirm Order & Create Bill</span>
              </button>
            ` : (isConfirmed ? `
              <button type="button" class="btn btn-outline btn-sm reprint-online-bill-btn" data-bill-no="${order.billNo}" style="cursor: pointer;">
                🖨️ Re-Print Thermal Receipt (${order.billNo})
              </button>
            ` : '')}
          </div>
        </div>
      `;
    }).join('');

    // Attach Confirm Click Handlers
    el.onlineOrdersListContainer.querySelectorAll('.confirm-online-order-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const oId = btn.getAttribute('data-order-id');
        if (oId) confirmAndBillOnlineOrder(oId);
      });
    });

    // Attach Reject Click Handlers
    el.onlineOrdersListContainer.querySelectorAll('.reject-online-order-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const oId = btn.getAttribute('data-order-id');
        const reason = prompt('Enter cancellation reason (e.g. Out of stock, Customer request):', 'Out of stock');
        if (reason && typeof shalomOrderQueue !== 'undefined') {
          shalomOrderQueue.rejectOrder(oId, reason);
          showToast(`Order #${oId} marked as Cancelled.`, 'info');
          renderOnlineOrders();
        }
      });
    });

    // Attach Reprint Handlers
    el.onlineOrdersListContainer.querySelectorAll('.reprint-online-bill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const bNo = btn.getAttribute('data-bill-no');
        const allBills = loadSavedBills();
        const found = allBills.find(b => b.billNo === bNo);
        if (found) {
          preview2InchThermalSlip(found);
        } else {
          showToast('Bill record not found.', 'error');
        }
      });
    });
  }

  function confirmAndBillOnlineOrder(orderId) {
    if (typeof shalomOrderQueue === 'undefined') {
      showToast('Order queue not found.', 'error');
      return;
    }
    const order = shalomOrderQueue.getOrderById(orderId);
    if (!order) {
      showToast('Order not found in queue.', 'error');
      return;
    }

    if (order.status === 'CONFIRMED') {
      showToast(`Order #${orderId} is already confirmed! (Bill #${order.billNo || ''})`, 'info');
      if (order.billNo) {
        const allBills = loadSavedBills();
        const found = allBills.find(b => b.billNo === order.billNo);
        if (found) preview2InchThermalSlip(found);
      }
      return;
    }

    try {
      // 1. Generate next POS Bill Number
      const billNumber = generateNextBillNumber();
      const totals = order.totals || {};
      const grandTotal = Number(totals.grandTotal || totals.total || 0);
      const subtotal = Number(totals.subtotal || (grandTotal - (totals.deliveryFee || 0)) || 0);

      // 2. Normalize items array
      const normalizedItems = (order.items || []).map(it => {
        const uPrice = Number(it.unitPrice || it.price || 0);
        const qty = Number(it.quantity || 1);
        return {
          id: it.id || it.productId || '',
          code: it.code || 'SK',
          name: it.name || 'Store Item',
          unitPrice: uPrice,
          quantity: qty,
          subtotal: uPrice * qty,
          unit: it.unit || 'Standard'
        };
      });

      // 3. Create official Bill Record
      const newBill = {
        billNo: billNumber,
        orderRefId: order.orderId,
        timestamp: new Date().toISOString(),
        formattedDate: new Date().toLocaleDateString('en-IN') + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        customerName: order.customer?.name || 'Online Customer',
        customerPhone: order.customer?.phone || '',
        paymentMode: 'UPI (Confirmed)',
        utrRef: order.payment?.utr || `UPI-ORD-${order.orderId}`,
        deliveryType: order.delivery?.type || 'Pickup',
        deliveryFee: Number(totals.deliveryFee || 0),
        discount: 0,
        gstMode: 'included',
        subtotal: subtotal,
        gstAmount: Number(totals.gst || 0),
        grandTotal: grandTotal,
        items: normalizedItems,
        status: 'Paid'
      };

      // 4. Save to Permanent POS Bills Storage (clean any duplicates first)
      const allBills = loadSavedBills();
      const filteredBills = allBills.filter(b => b.orderRefId !== order.orderId);
      filteredBills.unshift(newBill);
      saveBills(filteredBills);

      // 5. Deduct Stock in Real-Time using SHALOM_PRODUCTS master list
      if (typeof SHALOM_PRODUCTS !== 'undefined' && Array.isArray(SHALOM_PRODUCTS)) {
        normalizedItems.forEach(it => {
          const targetProd = SHALOM_PRODUCTS.find(p => p.id === it.id || (p.code && it.code && p.code === it.code));
          if (targetProd) {
            targetProd.stock = Math.max(0, (Number(targetProd.stock) || 0) - it.quantity);
            targetProd.inStock = targetProd.stock > 0;
          }
        });
        saveStockOverrides(false);
        updateKpis();
        renderStockTable();
      }

      // 6. Update Status in Online Order Queue & Cloud Sync
      shalomOrderQueue.confirmOrder(order.orderId, billNumber, newBill);

      // 7. Sound & Toast Feedback
      playScannerBeep();
      showToast(`✓ Order #${order.orderId} CONFIRMED! Generated Bill #${billNumber}`, 'success');

      // 8. Re-render views
      renderOnlineOrders();
      renderBillHistoryTable();

      // 9. Preview/Print Thermal Receipt
      preview2InchThermalSlip(newBill);
    } catch (err) {
      console.error('Error in confirmAndBillOnlineOrder:', err);
      showToast(`Confirmation error: ${err.message}`, 'error');
    }
  }

  // =========================================================================
  // TOAST HELPER
  // =========================================================================

  function showToast(message, type = 'info') {
    if (!el.toastContainer) el.toastContainer = document.getElementById('erpToastContainer');
    if (!el.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast-bubble';
    let icon = '🔔';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '⚠️';
    if (type === 'info') icon = '🧾';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    el.toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  }

  // =========================================================================
  // BIND DOM EVENTS
  // =========================================================================

  function bindGlobalEvents() {
    // Navigation Tabs
    el.tabPosBilling?.addEventListener('click', () => switchTab('posBillingView'));
    el.tabBillHistory?.addEventListener('click', () => switchTab('billHistoryView'));
    el.tabStockMaster?.addEventListener('click', () => switchTab('stockMasterView'));
    el.tabOnlineOrders?.addEventListener('click', () => switchTab('onlineOrdersView'));
    el.refreshOnlineOrdersBtn?.addEventListener('click', renderOnlineOrders);
    el.onlineOrdersFilter?.addEventListener('change', renderOnlineOrders);

    // Online Orders Event Delegation (guarantees click capture on dynamically rendered cards)
    el.onlineOrdersListContainer?.addEventListener('click', (e) => {
      const confirmBtn = e.target.closest('.confirm-online-order-btn');
      if (confirmBtn) {
        e.preventDefault();
        const oId = confirmBtn.getAttribute('data-order-id');
        if (oId) confirmAndBillOnlineOrder(oId);
        return;
      }

      const rejectBtn = e.target.closest('.reject-online-order-btn');
      if (rejectBtn) {
        e.preventDefault();
        const oId = rejectBtn.getAttribute('data-order-id');
        const reason = prompt('Enter cancellation reason (e.g. Out of stock, Customer request):', 'Out of stock');
        if (reason && typeof shalomOrderQueue !== 'undefined') {
          shalomOrderQueue.rejectOrder(oId, reason);
          showToast(`Order #${oId} marked as Cancelled.`, 'info');
          renderOnlineOrders();
        }
        return;
      }

      const reprintBtn = e.target.closest('.reprint-online-bill-btn');
      if (reprintBtn) {
        e.preventDefault();
        const bNo = reprintBtn.getAttribute('data-bill-no');
        const allBills = loadSavedBills();
        const found = allBills.find(b => b.billNo === bNo);
        if (found) {
          preview2InchThermalSlip(found);
        } else {
          showToast('Bill record not found.', 'error');
        }
        return;
      }
    });

    // Barcode Scanner input
    el.posBarcodeInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleBarcodeScan(el.posBarcodeInput.value);
      }
    });

    el.posScanSubmitBtn?.addEventListener('click', () => {
      handleBarcodeScan(el.posBarcodeInput.value);
    });

    // Manual item add
    el.posManualAddBtn?.addEventListener('click', () => {
      const pid = el.posItemSelect?.value;
      if (!pid) return;
      const product = SHALOM_PRODUCTS.find(p => p.id === pid);
      if (product) {
        addItemToActiveBill(product);
        playScannerBeep();
      }
    });

    // Clear Bill
    el.posClearBillBtn?.addEventListener('click', () => {
      if (activeBill.items.length === 0) return;
      if (confirm('Clear current bill items?')) {
        resetActiveBill();
        showToast('Bill cleared', 'info');
      }
    });

    // Cancel Edit Mode
    el.posCancelEditBtn?.addEventListener('click', () => {
      resetActiveBill();
      showToast('Edit mode cancelled', 'info');
    });

    // Payment Mode buttons
    el.posPaymentModesGrid?.querySelectorAll('.pay-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.posPaymentModesGrid.querySelectorAll('.pay-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeBill.paymentMode = btn.getAttribute('data-mode');
        
        if (el.posUpiRefGroup) {
          el.posUpiRefGroup.style.display = (activeBill.paymentMode === 'UPI') ? 'block' : 'none';
        }
      });
    });

    // Discount & GST input change
    el.posDiscountInput?.addEventListener('input', calculateBillTotals);
    el.posGstToggle?.addEventListener('change', calculateBillTotals);

    // Save & Print 2-Inch Thermal
    el.posPrintThermalBtn?.addEventListener('click', () => {
      const finalized = saveCurrentBill('Paid');
      if (finalized) {
        print2InchThermalReceipt(finalized);
        resetActiveBill();
      }
    });

    // Save Bill Only
    el.posSaveBillBtn?.addEventListener('click', () => {
      const finalized = saveCurrentBill('Paid');
      if (finalized) {
        resetActiveBill();
      }
    });

    // Preview Thermal Slip Modal
    el.posPreviewThermalBtn?.addEventListener('click', () => {
      if (activeBill.items.length === 0) {
        showToast('Add items to view thermal slip preview.', 'error');
        return;
      }
      const totals = calculateBillTotals();
      const mockBill = {
        billNo: activeBill.billNo,
        formattedDate: new Date().toLocaleDateString('en-IN') + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        customerName: el.posCustomerName?.value || 'Walk-in Customer',
        customerPhone: el.posCustomerPhone?.value || '',
        paymentMode: activeBill.paymentMode,
        utrRef: el.posUtrRef?.value || '',
        subtotal: totals.subtotal,
        discount: totals.discount,
        gstAmount: totals.gstAmount,
        grandTotal: totals.grandTotal,
        items: activeBill.items,
        status: 'PREVIEW'
      };
      preview2InchThermalSlip(mockBill);
    });

    // Modal close
    el.closeReceiptModalBtn?.addEventListener('click', closeReceiptModal);
    el.receiptModalBackdrop?.addEventListener('click', (e) => {
      if (e.target === el.receiptModalBackdrop) closeReceiptModal();
    });

    // History Search & Filter
    el.histSearchInput?.addEventListener('input', renderBillHistoryTable);
    el.histPaymentFilter?.addEventListener('change', renderBillHistoryTable);

    // Stock Management Events
    let searchTimer;
    el.erpSearchInput?.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        stockState.search = e.target.value.trim();
        stockState.page = 1;
        renderStockTable();
      }, 180);
    });

    el.erpCategorySelect?.addEventListener('change', (e) => {
      stockState.category = e.target.value;
      stockState.page = 1;
      renderStockTable();
    });

    el.erpStatusTabs?.querySelectorAll('.erp-tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        el.erpStatusTabs.querySelectorAll('.erp-tab-btn').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        stockState.status = tab.getAttribute('data-status');
        stockState.page = 1;
        renderStockTable();
      });
    });

    el.erpPrevPageBtn?.addEventListener('click', () => {
      if (stockState.page > 1) {
        stockState.page--;
        renderStockTable();
      }
    });

    el.erpNextPageBtn?.addEventListener('click', () => {
      stockState.page++;
      renderStockTable();
    });

    el.erpSaveStockBtn?.addEventListener('click', () => saveStockOverrides(true));
    el.erpResetStockBtn?.addEventListener('click', () => {
      if (confirm('Reset all stock overrides to defaults from SHALOM.xlsx?')) {
        localStorage.removeItem(STOCK_STORAGE_KEY);
        location.reload();
      }
    });
    el.erpExportSyncBtn?.addEventListener('click', exportOrdersForExcelSync);

    // Master Select-All checkbox on current page
    el.stockSelectAllPage?.addEventListener('change', () => {
      const filtered = getFilteredStockProducts();
      const startIdx = (stockState.page - 1) * stockState.pageSize;
      const endIdx = Math.min(startIdx + stockState.pageSize, filtered.length);
      const pageItems = filtered.slice(startIdx, endIdx);

      if (el.stockSelectAllPage.checked) {
        pageItems.forEach(p => stockState.selectedIds.add(p.id));
      } else {
        pageItems.forEach(p => stockState.selectedIds.delete(p.id));
      }
      if (el.erpSelectedCountBadge) {
        el.erpSelectedCountBadge.textContent = stockState.selectedIds.size;
      }
      renderStockTable();
    });

    // Barcode for selected items button
    el.erpBarcodeSelectedBtn?.addEventListener('click', () => {
      let selectedProducts = [];
      if (stockState.selectedIds.size > 0) {
        selectedProducts = SHALOM_PRODUCTS.filter(p => stockState.selectedIds.has(p.id));
      } else {
        // If 0 items selected, automatically select all items on current page for user convenience
        const filtered = getFilteredStockProducts();
        const startIdx = (stockState.page - 1) * stockState.pageSize;
        const endIdx = Math.min(startIdx + stockState.pageSize, filtered.length);
        const pageItems = filtered.slice(startIdx, endIdx);
        if (pageItems.length > 0) {
          pageItems.forEach(p => stockState.selectedIds.add(p.id));
          selectedProducts = pageItems;
          if (el.erpSelectedCountBadge) {
            el.erpSelectedCountBadge.textContent = stockState.selectedIds.size;
          }
          renderStockTable();
          showToast(`Selected all ${pageItems.length} items on current page for barcodes.`, 'info');
        }
      }

      if (selectedProducts.length === 0) {
        showToast('Please select at least 1 item using checkboxes to generate barcodes.', 'warning');
        return;
      }

      openBarcodeModal(selectedProducts);
    });

    // Barcode for active bill items button
    el.posBillBarcodeBtn?.addEventListener('click', () => {
      if (!state.items || state.items.length === 0) {
        showToast('Current bill is empty. Add items to generate barcodes.', 'info');
        return;
      }
      const billProducts = state.items.map(item => {
        const found = SHALOM_PRODUCTS.find(p => p.id === item.id);
        return found || {
          id: item.id,
          code: item.code || 'SKU-' + item.id,
          name: item.name,
          categoryName: 'Bill Item',
          price: item.unitPrice,
          unit: item.unit || 'Pack'
        };
      });
      openBarcodeModal(billProducts);
    });

    // Barcode Modal controls
    el.closeBarcodeModalBtn?.addEventListener('click', closeBarcodeModal);
    el.closeBarcodeModalBottomBtn?.addEventListener('click', closeBarcodeModal);
    el.barcodeModalBackdrop?.addEventListener('click', (e) => {
      if (e.target === el.barcodeModalBackdrop) closeBarcodeModal();
    });

    el.printBarcodeSheetBtn?.addEventListener('click', () => {
      let selected = SHALOM_PRODUCTS.filter(p => stockState.selectedIds.has(p.id));
      if (selected.length === 0 && el.barcodeLabelsContainer) {
        const cardIds = Array.from(el.barcodeLabelsContainer.querySelectorAll('.barcode-label-card')).map(c => c.getAttribute('data-id'));
        selected = SHALOM_PRODUCTS.filter(p => cardIds.includes(p.id));
      }
      if (selected.length > 0) {
        printBarcodeSheet(selected);
      } else {
        showToast('No products available to print.', 'warning');
      }
    });

    el.barcodeLabelSizeSelect?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!el.barcodeLabelsContainer) return;
      if (val === 'compact') {
        el.barcodeLabelsContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(220px, 1fr))';
      } else if (val === 'thermal') {
        el.barcodeLabelsContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
      } else {
        el.barcodeLabelsContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
      }
    });

    // Mobile Camera Scanner triggers
    el.posOpenMobileScannerBtn?.addEventListener('click', openMobileScanner);
    el.closeMobileScannerBtn?.addEventListener('click', stopMobileScanner);
    el.doneMobileScanBtn?.addEventListener('click', stopMobileScanner);
    el.flipCameraBtn?.addEventListener('click', flipCamera);
    el.mobileScannerModal?.addEventListener('click', (e) => {
      if (e.target === el.mobileScannerModal) stopMobileScanner();
    });

    // Wireless Phone Scanner Connection triggers
    el.posOpenWirelessConnectBtn?.addEventListener('click', openWirelessConnectModal);
    el.closeWirelessModalBtn?.addEventListener('click', closeWirelessConnectModal);
    el.closeWirelessModalBottomBtn?.addEventListener('click', closeWirelessConnectModal);
    el.wirelessScannerModal?.addEventListener('click', (e) => {
      if (e.target === el.wirelessScannerModal) closeWirelessConnectModal();
    });
    el.copyWirelessUrlBtn?.addEventListener('click', () => {
      const url = el.wirelessUrlDisplay?.textContent || '';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url.trim()).then(() => {
          showToast('Scanner link copied to clipboard!', 'success');
        });
      }
    });

    // Live clock update
    setInterval(() => {
      const now = new Date();
      if (el.posLiveClock) {
        el.posLiveClock.textContent = now.toLocaleDateString('en-IN') + ' ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      }
    }, 1000);
  }

  // =========================================================================
  // GOOGLE FIREBASE CLOUD SYNC CONTROLLER
  // =========================================================================

  function initCloudSyncUI() {
    if (typeof ShalomCloudSync === 'undefined') return;

    // Listen to Connection Status
    ShalomCloudSync.onStatusChange((connected, msg) => {
      if (el.cloudStatusDot) {
        el.cloudStatusDot.style.background = connected ? '#22c55e' : (ShalomCloudSync.isConfigured ? '#eab308' : '#94a3b8');
      }
      if (el.cloudStatusText) {
        el.cloudStatusText.textContent = connected ? '🟢 Cloud: Live' : (ShalomCloudSync.isConfigured ? '🟡 Connecting...' : '☁️ Setup Cloud');
      }
      if (el.cloudModalStatusLabel) {
        el.cloudModalStatusLabel.textContent = msg;
        el.cloudModalStatusLabel.style.color = connected ? '#15803d' : '#92400e';
      }
    });

    // Open Modal
    el.btnCloudSyncSettings?.addEventListener('click', () => {
      if (el.cloudFirebaseConfigTextarea) {
        const cur = ShalomCloudSync.loadConfig();
        el.cloudFirebaseConfigTextarea.value = cur ? JSON.stringify(cur, null, 2) : '';
      }
      el.cloudSyncModalBackdrop?.classList.add('open');
    });

    // Close Modal
    el.closeCloudSyncModalBtn?.addEventListener('click', () => {
      el.cloudSyncModalBackdrop?.classList.remove('open');
    });
    el.cloudSyncModalBackdrop?.addEventListener('click', (e) => {
      if (e.target === el.cloudSyncModalBackdrop) {
        el.cloudSyncModalBackdrop?.classList.remove('open');
      }
    });

    // Save Config
    el.btnSaveCloudConfig?.addEventListener('click', () => {
      const text = el.cloudFirebaseConfigTextarea?.value.trim();
      if (!text) {
        showToast('Please paste your Firebase configuration first.', 'error');
        return;
      }
      try {
        let parsed;
        let cleanText = text;
        if (cleanText.includes('=')) {
          cleanText = cleanText.substring(cleanText.indexOf('=') + 1).trim();
          if (cleanText.endsWith(';')) cleanText = cleanText.slice(0, -1).trim();
        }
        try {
          parsed = JSON.parse(cleanText);
        } catch (e) {
          parsed = (new Function(`return ${cleanText};`))();
        }

        const res = ShalomCloudSync.saveConfig(parsed);
        if (res.success) {
          showToast('✓ Cloud configuration saved! Connecting...', 'success');
          setTimeout(() => {
            if (ShalomCloudSync.isConnected) {
              showToast('🟢 Real-time Cloud Sync is LIVE!', 'success');
              el.cloudSyncModalBackdrop?.classList.remove('open');
            }
          }, 1200);
        } else {
          showToast(`Invalid config: ${res.error}`, 'error');
        }
      } catch (err) {
        showToast(`Could not parse config: ${err.message}`, 'error');
      }
    });

    // Disconnect Config
    el.btnClearCloudConfig?.addEventListener('click', () => {
      if (confirm('Disconnect Firebase cloud sync and return to local browser storage?')) {
        ShalomCloudSync.clearConfig();
        if (el.cloudFirebaseConfigTextarea) el.cloudFirebaseConfigTextarea.value = '';
        showToast('Cloud Sync disconnected.', 'info');
      }
    });

    // Test Connection
    el.btnTestCloudConnection?.addEventListener('click', () => {
      if (!ShalomCloudSync.isReady()) {
        showToast('Please enter and save your Firebase configuration first.', 'info');
        return;
      }
      showToast('Testing cloud connection...', 'info');
      ShalomCloudSync.db.ref('.info/connected').once('value').then(snap => {
        if (snap.val() === true) {
          showToast('🟢 Cloud Database is ONLINE and ready!', 'success');
        } else {
          showToast('🟡 Database contacted, awaiting connection confirmation...', 'info');
        }
      }).catch(err => {
        showToast(`Connection error: ${err.message}`, 'error');
      });
    });

    // Listen to Cloud Bills Sync
    ShalomCloudSync.onBills((cloudBills) => {
      if (Array.isArray(cloudBills) && cloudBills.length > 0) {
        const localBills = loadSavedBills();
        const map = new Map();
        cloudBills.forEach(b => { if (b && b.billNo) map.set(b.billNo, b); });
        localBills.forEach(b => {
          if (b && b.billNo && !map.has(b.billNo)) map.set(b.billNo, b);
        });
        const merged = Array.from(map.values());
        merged.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        saveBills(merged);
        renderBillHistoryTable();
        updateKpis();
      }
    });
  }

  // =========================================================================
  // INIT
  // =========================================================================

  function init() {
    loadStockOverrides();
    updateKpis();
    populateCategoryDropdown();
    populatePosItemSelect();
    renderActiveBillTable();
    renderStockTable();
    renderBillHistoryTable();
    renderOnlineOrders();
    if (typeof shalomOrderQueue !== 'undefined') {
      shalomOrderQueue.subscribe(() => {
        renderOnlineOrders();
      });
    }
    initRemoteScanListeners();
    bindGlobalEvents();
    initCloudSyncUI();

    // Auto-focus barcode input
    setTimeout(() => {
      el.posBarcodeInput?.focus();
    }, 150);
  }

  init();
});
