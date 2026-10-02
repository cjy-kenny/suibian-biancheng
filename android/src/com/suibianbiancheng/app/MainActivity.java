package com.suibianbiancheng.app;

import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * 随身编程 WebView 壳。
 * 所有请求都被拦截：优先用热更新目录 filesDir/web，没有的文件回落到 APK 内置 assets。
 * 浏览器引擎看到的是 https://appassets.local 这个"假域名"，
 * Web Worker / fetch / localStorage 都能正常工作。
 * 联网仅发生在用户主动「检查更新」时。
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.local";
    private static final String START_URL = "https://" + HOST + "/index.html";

    private WebView web;
    private File webDir;
    private boolean useWebDir = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        SharedPreferences sp = getSharedPreferences("update", MODE_PRIVATE);
        webDir = new File(getFilesDir(), "web");
        // 装了更新的整包 APK（原生版本号高于已应用的热更新）→ 旧热更新作废
        if (webDir.exists() && versionCode() > sp.getInt("applied_code", 0)) {
            deleteRecursive(webDir);
        }
        useWebDir = new File(webDir, "index.html").isFile();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage：代码保存
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setDisplayZoomControls(false);

        web.setBackgroundColor(Color.parseColor("#0D1117"));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return serveAsset(request.getUrl().getPath());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !HOST.equals(request.getUrl().getHost()); // 外部链接一律不放行
            }
        });
        web.addJavascriptInterface(new Bridge(), "AndroidUpdater");
        web.loadUrl(START_URL);
    }

    private int versionCode() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
        } catch (Exception e) {
            return 0;
        }
    }

    private WebResourceResponse serveAsset(String path) {
        if (path == null || path.equals("/") || path.isEmpty()) {
            path = "/index.html";
        }
        try {
            InputStream in = openAsset(path);
            if (in == null) {
                return null; // 找不到就交给 WebView 默认处理
            }
            String mime = guessMime(path);
            boolean textual = mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json");
            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Cache-Control", "no-cache");
            WebResourceResponse resp = new WebResourceResponse(mime, textual ? "utf-8" : null, in);
            resp.setResponseHeaders(headers);
            return resp;
        } catch (IOException e) {
            return null;
        }
    }

    private InputStream openAsset(String path) throws IOException {
        if (useWebDir && webDir.exists()) {
            File f = new File(webDir, path.substring(1));
            if (f.isFile()) {
                return new FileInputStream(f);
            }
        }
        return getAssets().open(path.substring(1));
    }

    private static String guessMime(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".wasm")) return "application/wasm";
        if (p.endsWith(".zip") || p.endsWith(".whl")) return "application/zip";
        return "application/octet-stream";
    }

    private static void deleteRecursive(File f) {
        if (f == null || !f.exists()) {
            return;
        }
        File[] list = f.listFiles();
        if (list != null) {
            for (File c : list) {
                deleteRecursive(c);
            }
        }
        f.delete();
    }

    /** 供网页层调用的更新桥（window.AndroidUpdater） */
    class Bridge {

        @JavascriptInterface
        public void check(final String baseUrl) {
            Updater.checkAndApply(MainActivity.this, baseUrl, result ->
                    web.post(() -> web.evaluateJavascript(
                            "window.__updateResult && window.__updateResult(" + result + ")", null)));
        }

        @JavascriptInterface
        public void restart() {
            web.post(() -> recreate()); // 重新加载，热更新即刻生效
        }

        @JavascriptInterface
        public int apkCode() {
            return versionCode();
        }
    }

    @Override
    public void onBackPressed() {
        moveTaskToBack(true); // 返回键 = 退到后台，保持运行状态
    }
}
