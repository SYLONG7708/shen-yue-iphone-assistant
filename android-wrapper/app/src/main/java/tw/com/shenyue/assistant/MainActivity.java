package tw.com.shenyue.assistant;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(7, 16, 24));
        getWindow().setNavigationBarColor(Color.rgb(7, 16, 24));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(7, 16, 24));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
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
        settings.setUserAgentString(settings.getUserAgentString() + " ShenYueAndroidApk/1.0.3");

        webView.setWebChromeClient(new WebChromeClient() {
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
                return handleUrl(request.getUrl().toString());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrl(url);
            }
        });

        webView.loadUrl(BuildConfig.HOME_URL);
    }

    private boolean handleUrl(String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        String scheme = uri.getScheme();
        String host = uri.getHost();

        if ("file".equals(scheme)) return false;
        if ("https".equals(scheme) && "sylong7708.github.io".equals(host)) return false;
        if ("https".equals(scheme) && isInlineVideoHost(host)) return false;

        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean isInlineVideoHost(String host) {
        if (host == null) return false;
        return host.endsWith("youtube.com")
                || host.endsWith("youtube-nocookie.com")
                || host.equals("youtu.be")
                || host.endsWith("ytimg.com")
                || host.endsWith("googlevideo.com")
                || host.endsWith("vimeo.com")
                || host.endsWith("vimeocdn.com");
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
}
