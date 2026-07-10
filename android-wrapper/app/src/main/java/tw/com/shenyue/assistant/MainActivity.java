package tw.com.shenyue.assistant;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.ServiceWorkerController;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.LinkedHashSet;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST_CODE = 7708;
    private static final String NATIVE_SESSION_STATE = "shen_yue_native_session";
    private WebView webView;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private ValueCallback<Uri[]> filePathCallback;
    private UpdateBridge updateBridge;
    private String nativeSessionToken;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        nativeSessionToken = savedInstanceState == null ? "" : savedInstanceState.getString(NATIVE_SESSION_STATE, "");
        if (nativeSessionToken.length() < 40) nativeSessionToken = createNativeSessionToken();
        getWindow().setStatusBarColor(Color.rgb(7, 16, 24));
        getWindow().setNavigationBarColor(Color.rgb(7, 16, 24));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(false);
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(7, 16, 24));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setGeolocationEnabled(false);
        settings.setSaveFormData(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            settings.setOffscreenPreRaster(true);
        }
        settings.setUserAgentString(settings.getUserAgentString() + " ShenYueAndroidApk/" + BuildConfig.VERSION_NAME);

        if (BuildConfig.HOME_URL.startsWith("https://")) {
            configureLiveCloudLoading(settings);
            settings.setAllowFileAccess(false);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                settings.setAllowFileAccessFromFileURLs(false);
                settings.setAllowUniversalAccessFromFileURLs(false);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            }
        }

        updateBridge = new UpdateBridge(this);
        webView.addJavascriptInterface(new SecureUpdateBridge(updateBridge, nativeSessionToken), "ShenYueNativeRaw");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams
            ) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = buildCompatibleFileChooser(fileChooserParams);

                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                } catch (ActivityNotFoundException error) {
                    MainActivity.this.filePathCallback = null;
                    filePathCallback.onReceiveValue(null);
                    Toast.makeText(MainActivity.this, "找不到可用的檔案選擇器。", Toast.LENGTH_LONG).show();
                    return false;
                }
                return true;
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }

                customView = view;
                customViewCallback = callback;
                webView.setVisibility(View.GONE);
                addContentView(customView, new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                ));
            }

            @Override
            public void onHideCustomView() {
                hideCustomView();
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request != null && !request.isForMainFrame()) return false;
                return handleUrl(view, request.getUrl().toString());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrl(view, url);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (isTrustedAppUrl(url)) view.evaluateJavascript(nativeBridgeBootstrapScript(), null);
            }
        });

        boolean restored = savedInstanceState != null && webView.restoreState(savedInstanceState) != null;
        if (!restored) {
            loadHomePage();
        }
    }

    private Intent buildCompatibleFileChooser(WebChromeClient.FileChooserParams fileChooserParams) {
        String[] mimeTypes = normalizeAcceptTypes(fileChooserParams == null ? null : fileChooserParams.getAcceptTypes());
        boolean allowMultiple = fileChooserParams != null
                && fileChooserParams.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE;

        Intent primary;
        try {
            primary = fileChooserParams == null ? null : fileChooserParams.createIntent();
        } catch (Exception error) {
            primary = null;
        }
        if (primary == null) {
            primary = new Intent(Intent.ACTION_GET_CONTENT);
        }
        configureOpenableIntent(primary, mimeTypes, allowMultiple);

        ArrayList<Intent> alternatives = new ArrayList<>();
        Intent allFiles = new Intent(Intent.ACTION_GET_CONTENT);
        configureOpenableIntent(allFiles, new String[] {"video/*", "*/*"}, allowMultiple);
        alternatives.add(allFiles);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            Intent document = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            configureOpenableIntent(document, mimeTypes.length == 0 ? new String[] {"video/*", "*/*"} : mimeTypes, allowMultiple);
            alternatives.add(document);
        }

        Intent video = new Intent(Intent.ACTION_GET_CONTENT);
        configureOpenableIntent(video, new String[] {"video/*", "application/octet-stream", "*/*"}, allowMultiple);
        alternatives.add(video);

        Intent chooser = Intent.createChooser(primary, "選擇檔案");
        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, alternatives.toArray(new Intent[0]));
        return chooser;
    }

    private void configureOpenableIntent(Intent intent, String[] mimeTypes, boolean allowMultiple) {
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        if (mimeTypes != null && mimeTypes.length > 0) {
            intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
        }
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, allowMultiple);
    }

    private String[] normalizeAcceptTypes(String[] acceptTypes) {
        LinkedHashSet<String> values = new LinkedHashSet<>();
        if (acceptTypes != null) {
            for (String acceptType : acceptTypes) {
                if (acceptType == null) continue;
                String[] parts = acceptType.split(",");
                for (String part : parts) {
                    String value = part.trim().toLowerCase(java.util.Locale.US);
                    if (value.length() == 0) continue;
                    if (value.startsWith(".")) {
                        if (".mp4".equals(value) || ".m4v".equals(value) || ".mov".equals(value)
                                || ".mkv".equals(value) || ".webm".equals(value) || ".3gp".equals(value)) {
                            values.add("video/*");
                        } else if (".apk".equals(value)) {
                            values.add("application/vnd.android.package-archive");
                            values.add("application/octet-stream");
                        } else if (".jpg".equals(value) || ".jpeg".equals(value) || ".png".equals(value)
                                || ".webp".equals(value) || ".gif".equals(value)) {
                            values.add("image/*");
                        }
                        continue;
                    }
                    values.add(value);
                }
            }
        }

        if (values.isEmpty()) {
            values.add("*/*");
        } else if (values.contains("video/*")) {
            values.add("application/octet-stream");
            values.add("*/*");
        }
        return values.toArray(new String[0]);
    }

    private boolean handleUrl(WebView view, String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        String scheme = uri.getScheme();
        String host = uri.getHost();

        if ("file".equals(scheme) && isTrustedAppUrl(url)) return false;
        if ("https".equals(scheme) && isTrustedAppUrl(url)) {
            return false;
        }
        if ("https".equals(scheme) && isInlineVideoHost(host)) return false;

        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private void configureLiveCloudLoading(WebSettings settings) {
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ServiceWorkerController.getInstance()
                    .getServiceWorkerWebSettings()
                    .setCacheMode(WebSettings.LOAD_DEFAULT);
        }
    }

    private void loadHomePage() {
        if (BuildConfig.HOME_URL.startsWith("https://")) {
            webView.loadUrl(withNativeSession(withCacheBuster(BuildConfig.HOME_URL)));
            return;
        }
        webView.loadUrl(withNativeSession(BuildConfig.HOME_URL));
    }

    private String withNativeSession(String url) {
        if (url == null || url.length() == 0) return url;
        return Uri.parse(url)
                .buildUpon()
                // A fragment never leaves the device in the HTTP request or Referer header.
                .encodedFragment("_native_session=" + Uri.encode(nativeSessionToken))
                .build()
                .toString();
    }

    private String withCacheBuster(String url) {
        if (url == null || !url.startsWith("https://")) return url;
        return Uri.parse(url)
                .buildUpon()
                .appendQueryParameter("_apk_live", String.valueOf(System.currentTimeMillis()))
                .build()
                .toString();
    }

    private boolean isInlineVideoHost(String host) {
        if (host == null) return false;
        String value = host.toLowerCase(java.util.Locale.US);
        return isHostOrSubdomain(value, "youtube.com")
                || isHostOrSubdomain(value, "youtube-nocookie.com")
                || value.equals("youtu.be")
                || isHostOrSubdomain(value, "ytimg.com")
                || isHostOrSubdomain(value, "googlevideo.com")
                || isHostOrSubdomain(value, "vimeo.com")
                || isHostOrSubdomain(value, "vimeocdn.com");
    }

    private boolean isHostOrSubdomain(String host, String trustedHost) {
        return host.equals(trustedHost) || host.endsWith("." + trustedHost);
    }

    private void hideCustomView() {
        if (customView == null) return;

        ViewGroup parent = (ViewGroup) customView.getParent();
        if (parent != null) {
            parent.removeView(customView);
        }
        customView = null;
        webView.setVisibility(View.VISIBLE);
        if (customViewCallback != null) {
            customViewCallback.onCustomViewHidden();
            customViewCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (customView != null) {
            hideCustomView();
            return;
        }
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST_CODE || filePathCallback == null) {
            return;
        }

        Uri[] results = null;
        if (resultCode == RESULT_OK) {
            if (data != null && data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                results = new Uri[count];
                for (int index = 0; index < count; index++) {
                    results[index] = data.getClipData().getItemAt(index).getUri();
                }
            } else if (data != null && data.getData() != null) {
                results = new Uri[] { data.getData() };
            }
        }

        if (updateBridge != null) {
            updateBridge.setLastSelectedFileUri(results != null && results.length > 0 ? results[0] : null);
        }

        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    private boolean isTrustedAppUrl(String value) {
        if (value == null || value.length() == 0) return false;
        try {
            Uri uri = Uri.parse(value);
            if ("file".equalsIgnoreCase(uri.getScheme())) {
                String path = uri.getPath() == null ? "" : uri.getPath();
                return path.startsWith("/android_asset/www/") || path.equals("/android_asset/www/index.html");
            }
            if (!"https".equalsIgnoreCase(uri.getScheme())) return false;
            if (!"sylong7708.github.io".equalsIgnoreCase(uri.getHost())) return false;
            String path = uri.getPath() == null ? "" : uri.getPath();
            return path.equals("/shen-yue-iphone-assistant") || path.startsWith("/shen-yue-iphone-assistant/");
        } catch (Exception ignored) {
            return false;
        }
    }

    private String createNativeSessionToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.encodeToString(bytes, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    }

    private String nativeBridgeBootstrapScript() {
        String methods = "['shareText','getDeviceState','getBundledManifest','getInstalledInfo','getInstalledBatch',"
                + "'downloadAndInstall','getTaskStatus','openInstallPermission','getVideoAccessState','requestVideoAccess',"
                + "'listLocalVideos','listLocalVideosAsync','getLocalVideoScanStatus','prepareLocalVideo',"
                + "'prepareLocalVideoAsync','getLocalVideoPrepareStatus','uploadLocalVideo','uploadLocalVideoOriginal',"
                + "'uploadLocalVideoAsync','uploadLocalVideoOriginalAsync','getLocalVideoUploadStatus',"
                + "'createLocalVideoShare','createLastSelectedVideoShare','inspectLastSelectedApk',"
                + "'getNativeCapabilities','configureEvergreen']";
        return "(()=>{try{"
                + "const token=" + JSONObject.quote(nativeSessionToken) + ";"
                + "sessionStorage.setItem('shenYueNativeSession',token);"
                + "const raw=window.ShenYueNativeRaw;"
                + "if(raw&&!window.ShenYueUpdater){"
                + "const call=(name)=>(...args)=>raw.invoke(token,name,JSON.stringify(args.map((value)=>value==null?'':String(value))));"
                + "if(typeof Proxy==='function'){window.ShenYueUpdater=new Proxy({}, {get:(_,name)=>name==='then'?undefined:call(String(name))});}"
                + "else{" + methods + ".forEach((name)=>{(window.ShenYueUpdater||(window.ShenYueUpdater={}))[name]=call(name);});}"
                + "}"
                + "window.dispatchEvent(new CustomEvent('shenYueNativeReady',{detail:{bridgeVersion:2}}));"
                + "}catch(error){}})();";
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putString(NATIVE_SESSION_STATE, nativeSessionToken);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            webView.evaluateJavascript(
                    "(()=>{"
                            + "window.dispatchEvent(new Event('shenYueApkResume'));"
                            + "document.querySelectorAll('iframe').forEach((frame)=>{"
                            + "try{frame.contentWindow.postMessage({type:'shenYueApkResume'},'*');}catch(e){}"
                            + "});"
                            + "})();",
                    null
            );
        }
    }
}
