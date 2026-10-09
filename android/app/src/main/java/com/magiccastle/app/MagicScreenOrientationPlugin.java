package com.magiccastle.app;

import android.content.pm.ActivityInfo;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "MagicScreenOrientation")
public class MagicScreenOrientationPlugin extends Plugin {
    @PluginMethod
    public void lockLandscape(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            WindowCompat.setDecorFitsSystemWindows(getActivity().getWindow(), false);
            WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(
                getActivity().getWindow(), getActivity().getWindow().getDecorView()
            );
            controller.hide(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
            call.resolve();
        });
    }

    @PluginMethod
    public void unlock(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
            WindowCompat.setDecorFitsSystemWindows(getActivity().getWindow(), true);
            WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(
                getActivity().getWindow(), getActivity().getWindow().getDecorView()
            );
            controller.show(WindowInsetsCompat.Type.systemBars());
            call.resolve();
        });
    }
}
