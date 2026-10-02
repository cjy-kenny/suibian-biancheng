package com.suibianbiancheng.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * 热更新：从更新源下载 version.json + bundle.zip（网页层资产），
 * 解压到 filesDir/web 后由 MainActivity 优先提供服务。
 * APK 原生层不变；原生层的更新仍需安装新 APK。
 */
public final class Updater {

    public interface Callback {
        void onResult(String json);
    }

    private Updater() {
    }

    public static void checkAndApply(final Context ctx, final String rawUrl, final Callback cb) {
        new Thread(() -> {
            String msg;
            try {
                if (rawUrl == null || rawUrl.trim().isEmpty()) {
                    throw new IllegalArgumentException("请先在设置里填写更新源地址");
                }
                String base = rawUrl.trim();
                if (!base.endsWith("/")) base += "/";
                JSONObject v = new JSONObject(fetch(base + "version.json", 8192));
                int code = v.getInt("code");
                String ver = v.getString("version");
                SharedPreferences sp = ctx.getSharedPreferences("update", Context.MODE_PRIVATE);
                int applied = sp.getInt("applied_code", 0);
                if (code <= applied) {
                    msg = "{\"ok\":true,\"updated\":false,\"message\":\"已是最新版本 v" + ver + "\"}";
                } else {
                    postStatus(cb, "正在下载 v" + ver + " 更新包…");
                    byte[] zip = fetchBytes(base + v.getString("bundle"));
                    File webDir = new File(ctx.getFilesDir(), "web");
                    File tmp = new File(ctx.getFilesDir(), "web_tmp");
                    deleteRecursive(tmp);
                    unzip(zip, tmp);
                    deleteRecursive(webDir);
                    if (!tmp.renameTo(webDir)) {
                        throw new IOException("更新目录切换失败");
                    }
                    sp.edit().putInt("applied_code", code).putString("applied_version", ver).apply();
                    msg = "{\"ok\":true,\"updated\":true,\"message\":\"已更新到 v" + ver + "，点「重启应用」生效\"}";
                }
            } catch (Exception e) {
                String m = String.valueOf(e.getMessage()).replace("\"", "'");
                msg = "{\"ok\":false,\"message\":\"更新失败：" + m + "\"}";
            }
            final String out = msg;
            cb.onResult(out);
        }, "updater").start();
    }

    private static void postStatus(final Callback cb, String text) {
        cb.onResult("{\"ok\":true,\"progress\":true,\"message\":\"" + text + "\"}");
    }

    private static String fetch(String url, int maxBytes) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(5000);
        c.setReadTimeout(30000);
        int rc = c.getResponseCode();
        if (rc != 200) {
            c.disconnect();
            throw new IOException("HTTP " + rc + "：" + url);
        }
        InputStream in = c.getInputStream();
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0 && bo.size() < maxBytes) {
            bo.write(buf, 0, n);
        }
        in.close();
        c.disconnect();
        return bo.toString("UTF-8");
    }

    private static byte[] fetchBytes(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(5000);
        c.setReadTimeout(120000);
        int rc = c.getResponseCode();
        if (rc != 200) {
            c.disconnect();
            throw new IOException("HTTP " + rc + "：" + url);
        }
        InputStream in = c.getInputStream();
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) {
            bo.write(buf, 0, n);
        }
        in.close();
        c.disconnect();
        return bo.toByteArray();
    }

    private static void unzip(byte[] data, File target) throws IOException {
        ZipInputStream z = new ZipInputStream(new ByteArrayInputStream(data));
        try {
            ZipEntry e;
            byte[] buf = new byte[16384];
            String root = target.getCanonicalPath() + File.separator;
            while ((e = z.getNextEntry()) != null) {
                File out = new File(target, e.getName());
                if (!out.getCanonicalPath().startsWith(root)) {
                    continue; // 防(zip-slip)路径逃逸
                }
                if (e.isDirectory()) {
                    out.mkdirs();
                    continue;
                }
                out.getParentFile().mkdirs();
                FileOutputStream fo = new FileOutputStream(out);
                int n;
                while ((n = z.read(buf)) > 0) {
                    fo.write(buf, 0, n);
                }
                fo.close();
                z.closeEntry();
            }
        } finally {
            z.close();
        }
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
}
