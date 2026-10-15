# 🌴 Shalom Kerala Stores • Gorakhpur

E-commerce & Inventory Management platform for **Shalom Kerala Stores**, Gorakhpur, Uttar Pradesh.

Specializing in authentic Kerala food items, traditional spices, church devotional articles, Christian literature, and stationery.

---

## 🏬 Project Structure

```
e:\MYWORKSPACE\SHALOM\
├── index.html                  # Public E-Commerce Web Storefront & Ordering Portal
├── inventory.html              # Store Inventory & Stock Management Console
├── SHALOM.xlsx                 # Master Product & Price Database
├── build_catalog.py            # Automated Catalog Extraction from Excel
├── build_products.py           # Product Manifest Compiler
├── sync_orders_to_excel.py     # Live Order Sync to Excel Workbook
├── inventory_sample.json       # Sample Inventory Data
├── images/                     # Product & Category Media (20 Assets)
├── css/
│   └── styles.css              # Tropical Emerald & Warm Gold Store Theme
├── BUILD_ANDROID_APP.bat       # One-Click Android App Sync & Local Build Helper
├── PUSH_TO_GITHUB.bat          # Git Push & Automated Cloud APK Compilation
├── sync_android_assets.py      # Syncs HTML/CSS/JS to Android Assets Folder
├── manifest.json               # Android PWA Installation Manifest
├── sw.js                       # Service Worker for Offline Caching
├── android/                    # Full Android Studio Native App Project
│   ├── app/
│   │   ├── build.gradle        # App dependencies & SDK config
│   │   └── src/main/
│   │       ├── AndroidManifest.xml # Permissions & Native UPI intent queries
│   │       ├── java/           # MainActivity with Camera & UPI handlers
│   │       ├── res/            # App icons, layouts & emerald themes
│   │       └── assets/www/     # Embedded offline index.html storefront
│   ├── build.gradle
│   └── gradlew / gradlew.bat
└── js/
    ├── app.js                  # Storefront Interactive App Logic
    ├── billing.js              # Checkout, Invoice & Billing Handler
    ├── cart.js                 # Cart State & Delivery Calculator
    ├── inventory.js            # Admin Inventory Operations
    ├── products.js             # Compiled Product Catalog
    ├── products_extracted.json # Extracted Catalog Feed
    ├── upi.js                  # UPI QR Code & Payment Handler
    └── html5-qrcode.min.js     # Barcode / QR Scanner Library
```

---

## 📱 Android App Options

### Option 1: Automated Cloud Build via GitHub (Easiest)
1. Double-click `PUSH_TO_GITHUB.bat`.
2. GitHub Actions will automatically compile the Android APK in the cloud.
3. Download the signed `.apk` directly from your repository's **Actions** tab.

### Option 2: Android Studio
1. Open Android Studio -> **Open an Existing Project**.
2. Select the `android/` directory inside `SHALOM`.
3. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

### Option 3: Instant Progressive Web App (PWA)
1. Open `index.html` in Google Chrome on any Android phone.
2. Tap the banner or browser menu (⋮) -> **Install App** / **Add to Home Screen**.
3. The app is installed instantly on your Android home screen with the official palm icon and full-screen experience.

---

## ⚡ Store Operations & Payment

- **Location**: Gorakhpur, Uttar Pradesh
- **Delivery**:
  - Store Pickup: **Free**
  - Within 5 Km: **₹50**
  - Up to 10 Km: **₹100**
- **Payment Method**: UPI (`7379325499@ybl`)
- **Support Contact**: `+91 73793 25499`

