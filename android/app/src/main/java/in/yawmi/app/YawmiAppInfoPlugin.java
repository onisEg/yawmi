package in.yawmi.app;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Read-only installed version plus a user-initiated hand-off to the browser.
 * Never installs a package, grants permissions, or manipulates user data.
 */
@CapacitorPlugin(name = "YawmiAppInfo")
public class YawmiAppInfoPlugin extends Plugin {
    @PluginMethod
    public void getInstalledVersion(PluginCall call) {
        try {
            String packageName = getContext().getPackageName();
            PackageInfo info = getContext().getPackageManager().getPackageInfo(packageName, 0);
            long versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                    ? info.getLongVersionCode() : info.versionCode;
            JSObject result = new JSObject();
            result.put("packageName", packageName);
            result.put("versionCode", versionCode);
            result.put("versionName", info.versionName == null ? "" : info.versionName);
            call.resolve(result);
        } catch (PackageManager.NameNotFoundException e) {
            call.reject("Installed app version not available", e);
        }
    }

    @PluginMethod
    public void openUpdateDownload(PluginCall call) {
        String url = call.getString("url", "");
        Uri uri = Uri.parse(url);
        String path = uri.getPath();
        // Only genuine official APK release URLs; no arbitrary deep links.
        if (!"https".equals(uri.getScheme())
                || !"github.com".equalsIgnoreCase(uri.getHost())
                || uri.getUserInfo() != null
                || uri.getPort() != -1
                || uri.getQuery() != null
                || uri.getFragment() != null
                || path == null
                || !path.matches("(?i)^/onisEg/yawmi/releases/download/android-beta-v0\\.[0-9]+\\.[0-9]+/Yawmi-Beta-v0\\.[0-9]+\\.[0-9]+\\.apk$")) {
            call.reject("Untrusted or invalid Android update URL");
            return;
        }
        try {
            Intent browser = new Intent(Intent.ACTION_VIEW, uri);
            browser.addCategory(Intent.CATEGORY_BROWSABLE);
            browser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(browser);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open Android download browser", e);
        }
    }
}
