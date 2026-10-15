package com.shalomstores.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {

    // Default: Loads offline/embedded assets from assets/www/index.html
    // To point to your live hosted website, update this URL:
    private static final String APP_URL = "file:///android_asset/www/index.html";

    private WebView webView;
    private SwipeRefreshLayout swipeRefreshLayout;
    private ProgressBar progressBar;
    private LinearLayout offlineContainer;
    private Button btnRetry;

    private ValueCallback<Uri[]> filePathCallback;
    private PermissionRequest pendingPermissionRequest;
    private long lastBackPressTime = 0;

    // Camera Permission Launcher for Barcode / QR Scanning
    private final ActivityResultLauncher<String> cameraPermissionLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), isGranted -> {
                if (pendingPermissionRequest != null) {
                    if (isGranted) {
                        pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                    } else {
                        pendingPermissionRequest.deny();
                        Toast.makeText(this, "Camera permission needed for barcode scanner", Toast.LENGTH_SHORT).show();
                    }
                    pendingPermissionRequest = null;
                }
            });

    // File Chooser Launcher (for receipt or image uploads)
    private final ActivityResultLauncher<Intent> fileChooserLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                if (filePathCallback == null) return;
                Uri[] results = null;
                if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                    String dataString = result.getData().getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    } else if (result.getData().getClipData() != null) {
                        final int numSelectedFiles = result.getData().getClipData().getItemCount();
                        results = new Uri[numSelectedFiles];
                        for (int i = 0; i < numSelectedFiles; i++) {
                            results[i] = result.getData().getClipData().getItemAt(i).getUri();
                        }
                    }
                }
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initViews();
        setupWebView();
        setupSwipeRefresh();
        setupBackNavigation();

        loadApp();
    }

    private void initViews() {
        webView = findViewById(R.id.mainWebView);
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout);
        progressBar = findViewById(R.id.topProgressBar);
        offlineContainer = findViewById(R.id.offlineContainer);
        btnRetry = findViewById(R.id.btnRetry);

        btnRetry.setOnClickListener(v -> {
            offlineContainer.setVisibility(View.GONE);
            loadApp();
        });
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();

        // Enable full web capabilities
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Responsive viewport settings
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);

        // Cache configuration
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Append custom user agent identifier
        String defaultUA = settings.getUserAgentString();
        settings.setUserAgentString(defaultUA + " ShalomStoresAndroidApp/1.0");

        // Custom WebViewClient: handles navigation & native UPI payment intents
        webView.setWebViewClient(new ShalomWebViewClient());

        // Custom WebChromeClient: handles camera permissions & file pickers
        webView.setWebChromeClient(new ShalomWebChromeClient());

        // Native Android Bridge: saves Name, Phone, and Address permanently to SharedPreferences
        webView.addJavascriptInterface(new ShalomAndroidBridge(), "ShalomAndroidBridge");
    }

    // =========================================================================
    // NATIVE ANDROID BRIDGE (Device Storage for Name, Phone & Address)
    // =========================================================================
    public class ShalomAndroidBridge {

        @android.webkit.JavascriptInterface
        public void saveCustomerProfile(String name, String phone, String address) {
            getSharedPreferences("ShalomCustomerPrefs", MODE_PRIVATE)
                    .edit()
                    .putString("name", name)
                    .putString("phone", phone)
                    .putString("address", address)
                    .apply();
        }

        @android.webkit.JavascriptInterface
        public String getSavedCustomerProfile() {
            android.content.SharedPreferences prefs = getSharedPreferences("ShalomCustomerPrefs", MODE_PRIVATE);
            String name = prefs.getString("name", "");
            String phone = prefs.getString("phone", "");
            String address = prefs.getString("address", "");
            if (name.isEmpty() || phone.isEmpty()) return "";
            try {
                org.json.JSONObject obj = new org.json.JSONObject();
                obj.put("name", name);
                obj.put("phone", phone);
                obj.put("address", address);
                return obj.toString();
            } catch (Exception e) {
                return "";
            }
        }

        @android.webkit.JavascriptInterface
        public void clearCustomerProfile() {
            getSharedPreferences("ShalomCustomerPrefs", MODE_PRIVATE)
                    .edit()
                    .clear()
                    .apply();
        }
    }

    private void setupSwipeRefresh() {
        swipeRefreshLayout.setColorSchemeColors(
                ContextCompat.getColor(this, R.color.gold_accent),
                ContextCompat.getColor(this, R.color.emerald_accent),
                ContextCompat.getColor(this, R.color.emerald_primary)
        );
        swipeRefreshLayout.setOnRefreshListener(() -> webView.reload());
    }

    private void setupBackNavigation() {
        // Modern predictive back handling (Android 13+)
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    if (System.currentTimeMillis() - lastBackPressTime < 2000) {
                        finish();
                    } else {
                        lastBackPressTime = System.currentTimeMillis();
                        Toast.makeText(MainActivity.this, "Press back again to exit Shalom Kerala Stores", Toast.LENGTH_SHORT).show();
                    }
                }
            }
        });
    }

    private void loadApp() {
        if (APP_URL.startsWith("http") && !isNetworkAvailable()) {
            offlineContainer.setVisibility(View.VISIBLE);
            return;
        }
        offlineContainer.setVisibility(View.GONE);
        webView.loadUrl(APP_URL);
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.net.Network network = cm.getActiveNetwork();
            if (network == null) return false;
            NetworkCapabilities actNw = cm.getNetworkCapabilities(network);
            return actNw != null && (actNw.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                    actNw.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                    actNw.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET));
        } else {
            android.net.NetworkInfo netInfo = cm.getActiveNetworkInfo();
            return netInfo != null && netInfo.isConnected();
        }
    }

    // =========================================================================
    // CUSTOM WEBVIEW CLIENT (Handles UPI Intents, WhatsApp, Dialing)
    // =========================================================================
    private class ShalomWebViewClient extends WebViewClient {

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return handleUrl(request.getUrl().toString());
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return handleUrl(url);
        }

        private boolean handleUrl(String url) {
            if (url == null) return false;

            // 1. UPI Payment Links (Google Pay, PhonePe, Paytm, BHIM, etc.)
            if (url.startsWith("upi://")) {
                try {
                    Intent upiIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    Intent chooser = Intent.createChooser(upiIntent, "Pay with UPI Application");
                    startActivity(chooser);
                    return true;
                } catch (ActivityNotFoundException e) {
                    Toast.makeText(MainActivity.this, "No UPI payment app found on your phone (Google Pay, PhonePe, Paytm)", Toast.LENGTH_LONG).show();
                    return true;
                }
            }

            // 2. WhatsApp Direct Chat / Bill Share
            if (url.startsWith("whatsapp://") || url.startsWith("https://wa.me/") || url.startsWith("https://api.whatsapp.com/")) {
                try {
                    Intent waIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(waIntent);
                    return true;
                } catch (ActivityNotFoundException e) {
                    Toast.makeText(MainActivity.this, "WhatsApp is not installed on this device", Toast.LENGTH_SHORT).show();
                    return true;
                }
            }

            // 3. Telephone Dialing
            if (url.startsWith("tel:")) {
                try {
                    Intent telIntent = new Intent(Intent.ACTION_DIAL, Uri.parse(url));
                    startActivity(telIntent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }

            // 4. Email links
            if (url.startsWith("mailto:")) {
                try {
                    Intent mailIntent = new Intent(Intent.ACTION_SENDTO, Uri.parse(url));
                    startActivity(mailIntent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }

            // 5. External Web Links (Open in system browser)
            if (url.startsWith("http://") || url.startsWith("https://")) {
                // If it's a domain outside Shalom or Firebase Auth, open in external browser
                if (!url.contains("github.io") && !url.contains("firebase") && !url.contains("google.com")) {
                    try {
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(browserIntent);
                        return true;
                    } catch (Exception ignored) {}
                }
            }

            return false;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            progressBar.setVisibility(View.VISIBLE);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            progressBar.setVisibility(View.GONE);
            swipeRefreshLayout.setRefreshing(false);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                progressBar.setVisibility(View.GONE);
                swipeRefreshLayout.setRefreshing(false);
                if (!isNetworkAvailable()) {
                    offlineContainer.setVisibility(View.VISIBLE);
                }
            }
        }
    }

    // =========================================================================
    // CUSTOM WEBCHROME CLIENT (Camera Barcode Scanning & File Uploads)
    // =========================================================================
    private class ShalomWebChromeClient extends WebChromeClient {

        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            progressBar.setProgress(newProgress);
            if (newProgress == 100) {
                progressBar.setVisibility(View.GONE);
            }
        }

        // Camera Permission for HTML5 QR/Barcode Scanner
        @Override
        public void onPermissionRequest(final PermissionRequest request) {
            runOnUiThread(() -> {
                for (String res : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)) {
                        if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                                == PackageManager.PERMISSION_GRANTED) {
                            request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                        } else {
                            pendingPermissionRequest = request;
                            cameraPermissionLauncher.launch(Manifest.permission.CAMERA);
                        }
                        return;
                    }
                }
                request.grant(request.getResources());
            });
        }

        // File Chooser Handler
        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                         FileChooserParams fileChooserParams) {
            MainActivity.this.filePathCallback = filePathCallback;
            Intent intent = fileChooserParams.createIntent();
            try {
                fileChooserLauncher.launch(intent);
            } catch (ActivityNotFoundException e) {
                MainActivity.this.filePathCallback = null;
                Toast.makeText(MainActivity.this, "Cannot open file chooser", Toast.LENGTH_SHORT).show();
                return false;
            }
            return true;
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
