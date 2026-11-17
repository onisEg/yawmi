package in.yawmi.app;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Read installed versionCode (rather than guessing from web assets) and hand
 * user-approved signed APK downloads to Android's browser/download manager.
 * No silent installs, no storage migration, no extra permissions.
 */
@CapacitorPlugin(name = "YawmiUpdates")
public class YawmiUpdatesPlugin extends Plugin {
    @PluginMethod
    public void getInstalledVersion(PluginCall call) {
        try {
            String packageName = getContext().getPackageName();
            PackageInfo info = getContext().getPackageManager().getPackageInfo(packageName, 0);
            long code = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? info.getLongVersionCode() : info.versionCode;
            JSObject result = new JSObject();
            result.put("packageName", packageName);
            result.put("versionCode", code);
            result.put("versionName", info.versionName == null ? "" : info.versionName);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Could not read the installed Android app version", error);
        }
    }

    @PluginMethod
    public void openOfficialApk(PluginCall call) {
        String url = call.getString("url");
        if (url == null) {
            call.reject("APK URL missing");
            return;
        }
        try {
            Uri uri = Uri.parse(url);
            String path = uri.getEncodedPath();
            boolean allowed = "https".equals(uri.getScheme())
                && "github.com".equals(uri.getHost())
                && uri.getPort() == -1
                && uri.getQuery() == null
                && uri.getFragment() == null
                && path != null
                && (path.matches("/onisEg/yawmi/releases/download/android-beta-v0\\.(3|4)\\.[0-9]+/Yawmi-Beta-v0\\.(3|4)\\.[0-9]+\\.apk")
                || path.matches("/onisEg/yawmi/releases/download/android-beta-v1\\.0\\.([0-9]+)/Yawmi-Beta-v1\\.0\\.\\1\\.apk"));
            if (!allowed) {
                call.reject("Only official Yawmi GitHub Release APK links are allowed");
                return;
            }
            Intent browser = new Intent(Intent.ACTION_VIEW, uri);
            browser.addCategory(Intent.CATEGORY_BROWSABLE);
            getContext().startActivity(browser);
            call.resolve();
        } catch (Exception error) {
            call.reject("Unable to open the official APK download", error);
        }
    }
}
