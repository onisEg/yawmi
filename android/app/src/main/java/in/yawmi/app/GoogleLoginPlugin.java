package in.yawmi.app;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "YawmiGoogleLogin")
public class GoogleLoginPlugin extends Plugin {
    private Uri pending;

    private synchronized void accept(Intent intent) {
        Uri uri = intent == null ? null : intent.getData();
        if (uri == null || !Intent.ACTION_VIEW.equals(intent.getAction())
                || !"in.yawmi.app.v1".equals(uri.getScheme())
                || !"auth".equals(uri.getEncodedAuthority()) || !"/callback".equals(uri.getEncodedPath())) return;
        pending = uri;
        intent.setData(null);
        notifyListeners("callback", new JSObject());
    }

    @Override public void load() { accept(getActivity().getIntent()); }
    @Override protected void handleOnNewIntent(Intent intent) { accept(intent); }

    @PluginMethod
    public synchronized void takeCallback(PluginCall call) {
        JSObject result = new JSObject();
        if (pending != null) {
            String code = pending.getQueryParameter("code");
            if (code != null && !code.isEmpty()) result.put("code", code);
            else result.put("cancelled", true);
            pending = null;
        }
        call.resolve(result);
    }

    @PluginMethod
    public void open(PluginCall call) {
        try {
            Uri uri = Uri.parse(call.getString("url", ""));
            if (!"https".equals(uri.getScheme())
                    || !"jtldivmllnzktnzgwtsm.supabase.co".equals(uri.getEncodedAuthority())
                    || !"/auth/v1/authorize".equals(uri.getEncodedPath())
                    || !"google".equals(uri.getQueryParameter("provider"))
                    || !"in.yawmi.app.v1://auth/callback".equals(uri.getQueryParameter("redirect_to"))
                    || !"s256".equalsIgnoreCase(uri.getQueryParameter("code_challenge_method"))) {
                call.reject("Invalid Google login request");
                return;
            }
            getActivity().startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE));
            call.resolve();
        } catch (RuntimeException error) {
            call.reject("تعذّر فتح المتصفح لتسجيل الدخول");
        }
    }
}
