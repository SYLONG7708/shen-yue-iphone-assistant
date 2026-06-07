package tw.com.shenyue.assistant;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInstaller;
import android.os.Build;
import android.widget.Toast;

public class InstallStatusReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        String appName = intent.getStringExtra("appName");
        if (appName == null || appName.length() == 0) {
            appName = "APK";
        }

        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirmIntent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                confirmIntent = intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class);
            } else {
                confirmIntent = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            }
            if (confirmIntent != null) {
                confirmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(confirmIntent);
                writeStatus(context, appName + " 等待使用者確認安裝。");
            }
            return;
        }

        String message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
        String output;
        if (status == PackageInstaller.STATUS_SUCCESS) {
            output = appName + " 安裝完成。";
        } else {
            output = appName + " 安裝失敗";
            if (message != null && message.length() > 0) {
                output += "：" + message;
            }
        }

        writeStatus(context, output);
    }

    private void writeStatus(Context context, String message) {
        SharedPreferences preferences = context.getSharedPreferences(UpdateBridge.PREFS_NAME, Context.MODE_PRIVATE);
        preferences.edit().putString(UpdateBridge.LAST_INSTALL_STATUS, message).apply();
        Toast.makeText(context, message, Toast.LENGTH_LONG).show();
    }
}
