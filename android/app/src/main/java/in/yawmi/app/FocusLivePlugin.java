package in.yawmi.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.lang.reflect.Method;

/**
 * Best-effort Android ongoing countdown notification.
 * Native OS chronometer runs while the WebView is paused. This is NOT a
 * foreground service: no wakelock, per-second polling, or background CPU.
 * API 36.1 may promote it into a system Live Update/status chip. OEMs decide
 * whether a chip/"island" is actually displayed.
 */
@CapacitorPlugin(name = "YawmiFocusLive")
public class FocusLivePlugin extends Plugin {
    private static final String CHANNEL = "yawmi_focus_live_v1";
    // Deliberately distinct from low-importance, silent ongoing channel:
    // Android 8+ notification sound is controlled by the channel itself.
    private static final String WORK_DONE_CHANNEL = "yawmi_focus_work_done_v1";
    private static final String BREAK_DONE_CHANNEL = "yawmi_focus_break_done_v1";
    private static final int NOTIFICATION_ID = 15011;
    private static final long MAX_SESSION_MS = 24L * 60 * 60 * 1000;

    private NotificationManager notifications() {
        return (NotificationManager) getContext().getSystemService(NotificationManager.class);
    }

    private void ensureCompletionChannel(String id, String name) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = notifications();
        NotificationChannel channel = new NotificationChannel(
                id, name, NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("تنبيه مسموع بنهاية فترة التركيز أو الراحة");
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[]{0, 180, 90, 180});
        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        channel.setSound(sound, attrs);
        manager.createNotificationChannel(channel);
        // Existing channel settings belong to the user. NEVER delete or force
        // reset a channel when a user has muted it on their device.
    }

    @PluginMethod
    public void prepareCompletionAlerts(PluginCall call) {
        try {
            ensureCompletionChannel(WORK_DONE_CHANNEL, "انتهاء فترة التركيز 🔔");
            ensureCompletionChannel(BREAK_DONE_CHANNEL, "انتهاء فترة الراحة 🔔");
            JSObject result = new JSObject();
            result.put("workChannel", WORK_DONE_CHANNEL);
            result.put("breakChannel", BREAK_DONE_CHANNEL);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to configure focus completion alerts", e);
        }
    }

    @PluginMethod
    public void show(PluginCall call) {
        Double end = call.getDouble("endsAt");
        String phase = call.getString("phase", "work");
        if (end == null || !Double.isFinite(end) || (!"work".equals(phase) && !"break".equals(phase))) {
            call.reject("Invalid focus deadline or phase");
            return;
        }
        long endsAt = end.longValue();
        long remaining = endsAt - System.currentTimeMillis();
        if (remaining <= 0 || remaining > MAX_SESSION_MS) {
            call.reject("Focus deadline must be in the next 24 hours");
            return;
        }

        if (Build.VERSION.SDK_INT >= 33 &&
                getContext().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            JSObject result = new JSObject();
            result.put("posted", false);
            result.put("reason", "notifications-permission-denied");
            call.resolve(result);
            return;
        }
        try {
            NotificationManager manager = notifications();
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL, "مؤقت التركيز", NotificationManager.IMPORTANCE_LOW);
                channel.setDescription("عرض الوقت المتبقي للتركيز والراحة في الإشعارات");
                channel.setShowBadge(false);
                manager.createNotificationChannel(channel);
            }
            boolean isBreak = "break".equals(phase);
            Intent openApp = new Intent(getContext(), MainActivity.class);
            openApp.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pending = PendingIntent.getActivity(
                getContext(), 0, openApp, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            Notification.Builder baseBuilder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(getContext(), CHANNEL)
                : new Notification.Builder(getContext()); // Android 7 fallback
            Notification.Builder builder = baseBuilder
                .setSmallIcon(isBreak ? R.drawable.ic_yawmi_break : R.drawable.ic_yawmi_focus)
                .setContentTitle(isBreak ? "☕ وقت الراحة" : "🎯 وقت التركيز")
                .setContentText(isBreak ? "ارتاح شوية — الوقت المتبقي" : "يومي — الوقت المتبقي للتركيز")
                .setContentIntent(pending)
                .setWhen(endsAt)
                .setShowWhen(true)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setTimeoutAfter(remaining + 15000L)
                .setCategory(Notification.CATEGORY_PROGRESS)
                .setVisibility(Notification.VISIBILITY_PUBLIC);

            // Android 16 QPR (API 36.1) adds this Builder method. Reflection
            // avoids requiring the SDK 36.1 extension while remaining safe
            // for API 24–36. Standard ongoing notification is the fallback.
            if (Build.VERSION.SDK_INT >= 36) {
                try {
                    Method promote = Notification.Builder.class.getMethod("setRequestPromotedOngoing", boolean.class);
                    promote.invoke(builder, true);
                } catch (ReflectiveOperationException | SecurityException ignored) {
                    // Firmware/SDK does not have the promotion API.
                }
            }
            manager.notify(NOTIFICATION_ID, builder.build());
            JSObject result = new JSObject();
            result.put("posted", true);
            result.put("phase", phase);
            call.resolve(result);
        } catch (SecurityException exception) {
            call.reject("Notification permission not granted", exception);
        } catch (Exception exception) {
            call.reject("Unable to show focus status notification", exception);
        }
    }

    @PluginMethod
    public void hide(PluginCall call) {
        notifications().cancel(NOTIFICATION_ID);
        call.resolve();
    }
}
