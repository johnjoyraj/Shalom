/**
 * Shalom Kerala Stores - Dynamic UPI Payment Gateway
 * Merchant UPI: 7379325499@ybl
 * Gorakhpur, Uttar Pradesh
 */

class ShalomUPIEngine {
  constructor() {
    this.merchantVPA = (window.STORE_CONFIG && window.STORE_CONFIG.upiId) || "7379325499@ybl";
    this.merchantName = (window.STORE_CONFIG && window.STORE_CONFIG.storeName) || "Shalom Kerala Stores";
    this.timerInterval = null;
    this.timeLeftSeconds = 600; // 10 minutes
    this.currentOrder = null;
  }

  /**
   * Generates NPCI-standard UPI URI
   */
  generateUpiUri(orderId, amount, customerName = "") {
    const formattedAmount = Number(amount).toFixed(2);
    const cleanNote = `Shalom Order ${orderId}`.replace(/\s+/g, '%20');
    const cleanPn = encodeURIComponent(this.merchantName);
    
    return `upi://pay?pa=${this.merchantVPA}&pn=${cleanPn}&am=${formattedAmount}&cu=INR&tn=${cleanNote}&tr=${orderId}`;
  }

  /**
   * Renders the Dynamic UPI QR Code
   */
  renderQrCode(containerEl, upiUri, amount) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    const qrWrapper = document.createElement('div');
    qrWrapper.className = 'upi-qr-card';

    const encodedUri = encodeURIComponent(upiUri);
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodedUri}`;

    qrWrapper.innerHTML = `
      <div class="qr-canvas-holder">
        <div class="qr-decor-corner top-left"></div>
        <div class="qr-decor-corner top-right"></div>
        <div class="qr-decor-corner bottom-left"></div>
        <div class="qr-decor-corner bottom-right"></div>
        <img src="${qrImgUrl}" alt="Scan to pay ₹${amount} via UPI to 7379325499@ybl" class="upi-generated-img" id="upiLiveQrImage" />
        <div class="qr-center-badge">
          <span class="qr-badge-text">UPI</span>
        </div>
      </div>
      <div class="qr-scan-hint">
        <span class="pulse-dot"></span>
        <span>Scan with <strong>PhonePe, GPay, Paytm or BHIM</strong></span>
      </div>
      <div class="qr-vpa-badge-display">
        UPI ID: <strong>${this.merchantVPA}</strong>
      </div>
    `;

    containerEl.appendChild(qrWrapper);

    // Fallback if image fails
    const liveImg = qrWrapper.querySelector('#upiLiveQrImage');
    if (liveImg && window.QRCode) {
      liveImg.onerror = () => {
        liveImg.style.display = 'none';
        const canvasDiv = document.createElement('div');
        canvasDiv.id = 'fallbackQrCanvas';
        qrWrapper.querySelector('.qr-canvas-holder').appendChild(canvasDiv);
        new window.QRCode(canvasDiv, {
          text: upiUri,
          width: 240,
          height: 240,
          colorDark: "#06281e",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.M
        });
      };
    }
  }

  /**
   * Starts payment timer
   */
  startPaymentTimer(displayElement, onExpireCallback) {
    this.clearInterval();
    this.timeLeftSeconds = 600;

    const updateTimer = () => {
      const minutes = Math.floor(this.timeLeftSeconds / 60);
      const seconds = this.timeLeftSeconds % 60;
      const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      
      if (displayElement) {
        displayElement.textContent = formatted;
      }

      if (this.timeLeftSeconds <= 0) {
        this.clearInterval();
        if (onExpireCallback) onExpireCallback();
      } else {
        this.timeLeftSeconds--;
      }
    };

    updateTimer();
    this.timerInterval = setInterval(updateTimer, 1000);
  }

  clearInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Play celebration sound
   */
  playSuccessSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.12, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.6);
      });
    } catch (e) {}
  }
}

const shalomUpi = new ShalomUPIEngine();
