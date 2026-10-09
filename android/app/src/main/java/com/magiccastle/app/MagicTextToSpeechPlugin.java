package com.magiccastle.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(name = "MagicTextToSpeech")
public class MagicTextToSpeechPlugin extends Plugin {
    private TextToSpeech textToSpeech;
    private boolean initialized = false;
    private boolean initFailed = false;
    private final Map<String, PluginCall> pendingCalls = new ConcurrentHashMap<>();
    private final List<PluginCall> waitingForInitialization = new ArrayList<>();

    @Override
    public void load() {
        textToSpeech = new TextToSpeech(getContext(), status -> {
            List<PluginCall> waitingCalls;
            synchronized (this) {
                initialized = status == TextToSpeech.SUCCESS;
                initFailed = !initialized;
                waitingCalls = new ArrayList<>(waitingForInitialization);
                waitingForInitialization.clear();
            }
            for (PluginCall call : waitingCalls) {
                if (initialized) speakNow(call);
                else {
                    call.setKeepAlive(false);
                    call.reject("系统朗读引擎初始化失败。", "ENGINE_UNAVAILABLE");
                }
            }
        });
        textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override
            public void onStart(String utteranceId) { }

            @Override
            public void onDone(String utteranceId) {
                finishCall(utteranceId, null);
            }

            @Override
            @Deprecated
            public void onError(String utteranceId) {
                finishCall(utteranceId, "系统朗读失败。");
            }

            @Override
            public void onError(String utteranceId, int errorCode) {
                finishCall(utteranceId, "系统朗读失败，错误代码：" + errorCode);
            }
        });
    }

    @PluginMethod
    public void isLanguageSupported(PluginCall call) {
        JSObject result = new JSObject();
        String language = call.getString("lang", "");
        Locale locale = supportedLocale(language);
        Voice voice = locale == null ? findVoice(language) : null;
        boolean supported = locale != null || voice != null;
        result.put("supported", supported);
        result.put("missingData", !supported && initialized);
        result.put("viaVoice", voice != null);
        call.resolve(result);
    }

    @PluginMethod
    public void openLanguageInstall(PluginCall call) {
        Intent[] candidates = {
            new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA),
            new Intent(TextToSpeech.Engine.ACTION_CHECK_TTS_DATA),
            new Intent("android.settings.TTS_SETTINGS"),
            new Intent("android.settings.INPUT_METHOD_SETTINGS")
        };
        for (Intent intent : candidates) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getContext().startActivity(intent);
                call.resolve();
                return;
            } catch (Exception ignored) {
                // Try the next system entry point; not every build exposes every screen.
            }
        }
        call.reject("无法打开系统语音设置页面。");
    }

    @PluginMethod
    public void speak(PluginCall call) {
        synchronized (this) {
            if (initFailed) {
                call.setKeepAlive(false);
                call.reject("系统朗读引擎不可用。", "ENGINE_UNAVAILABLE");
                return;
            }
            if (!initialized || textToSpeech == null) {
                call.setKeepAlive(true);
                waitingForInitialization.add(call);
                return;
            }
        }
        speakNow(call);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (textToSpeech != null) textToSpeech.stop();
        for (Map.Entry<String, PluginCall> entry : pendingCalls.entrySet()) finishCall(entry.getKey(), null);
        synchronized (this) {
            for (PluginCall waitingCall : waitingForInitialization) {
                waitingCall.setKeepAlive(false);
                waitingCall.resolve();
            }
            waitingForInitialization.clear();
        }
        call.resolve();
    }

    private void speakNow(PluginCall call) {
        if (textToSpeech == null) {
            call.setKeepAlive(false);
            call.reject("系统朗读引擎尚未准备好。");
            return;
        }
        String language = call.getString("lang", "en-US");
        Locale locale = supportedLocale(language);
        // Some engines never return LANG_AVAILABLE for a language they actually ship
        // (common for Chinese data on Chinese OEM builds), so also look for a matching Voice.
        Voice voice = locale == null ? findVoice(language) : null;
        if (locale == null && voice == null) {
            call.setKeepAlive(false);
            call.reject("当前设备没有可用的 " + language + " 朗读语音。", "LANGUAGE_MISSING");
            return;
        }
        int setResult;
        if (voice != null) {
            setResult = textToSpeech.setVoice(voice);
            if (setResult != TextToSpeech.SUCCESS) {
                call.setKeepAlive(false);
                call.reject("当前设备无法启用 " + language + " 朗读语音。", "LANGUAGE_MISSING");
                return;
            }
        } else {
            setResult = textToSpeech.setLanguage(locale);
            if (setResult < TextToSpeech.LANG_AVAILABLE) {
                call.setKeepAlive(false);
                call.reject("当前设备无法启用 " + language + " 朗读语音。", "LANGUAGE_MISSING");
                return;
            }
        }
        ensureMatchingVoice(language);

        textToSpeech.setSpeechRate(call.getFloat("rate", 1.0f));
        textToSpeech.setPitch(call.getFloat("pitch", 1.0f));
        String utteranceId = UUID.randomUUID().toString();
        Bundle params = new Bundle();
        params.putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, utteranceId);
        params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, call.getFloat("volume", 1.0f));

        call.setKeepAlive(true);
        pendingCalls.put(utteranceId, call);
        int result = textToSpeech.speak(call.getString("text", ""), TextToSpeech.QUEUE_FLUSH, params, utteranceId);
        if (result == TextToSpeech.ERROR) finishCall(utteranceId, "系统朗读未能开始。");
    }

    /**
     * Engines sometimes accept setLanguage() yet keep a default voice that does not match the
     * requested language (Chinese then comes out silent). Force a voice that really matches.
     */
    private void ensureMatchingVoice(String language) {
        String base = baseLanguage(language);
        if (base.isEmpty()) return;
        Voice current = null;
        try { current = textToSpeech.getVoice(); } catch (Exception ignored) { }
        if (current != null && current.getLocale() != null) {
            if (base.equals(baseLanguage(current.getLocale().getLanguage()))) return;
        }
        Voice candidate = findVoice(language);
        if (candidate == null) return;
        try { textToSpeech.setVoice(candidate); } catch (Exception ignored) { }
    }

    private String baseLanguage(String language) {
        if (language == null || language.isEmpty()) return "";
        String base = language.split("[-_]")[0].toLowerCase(Locale.ROOT);
        if ("cmn".equals(base)) base = "zh";
        return base;
    }

    /**
     * Fallback voice lookup for engines whose isLanguageAvailable() is unreliable.
     * Prefers an offline voice, then the highest quality match.
     */
    private Voice findVoice(String language) {
        if (!initialized || textToSpeech == null) return null;
        String base = baseLanguage(language);
        if (base.isEmpty()) return null;
        Set<Voice> voices;
        try { voices = textToSpeech.getVoices(); } catch (Exception ignored) { return null; }
        if (voices == null || voices.isEmpty()) return null;
        List<Voice> matched = new ArrayList<>();
        for (Voice voice : voices) {
            if (voice == null || voice.getLocale() == null) continue;
            if (!base.equals(baseLanguage(voice.getLocale().getLanguage()))) continue;
            matched.add(voice);
        }
        if (matched.isEmpty()) return null;
        matched.sort((left, right) -> {
            boolean leftOffline = !left.isNetworkConnectionRequired();
            boolean rightOffline = !right.isNetworkConnectionRequired();
            if (leftOffline != rightOffline) return leftOffline ? -1 : 1;
            return right.getQuality() - left.getQuality();
        });
        return matched.get(0);
    }

    private Locale supportedLocale(String language) {
        if (!initialized || textToSpeech == null) return null;
        String base = baseLanguage(language);
        Set<Locale> candidates = new LinkedHashSet<>();
        if (language != null && !language.isEmpty()) candidates.add(Locale.forLanguageTag(language));
        if ("zh".equals(base)) {
            candidates.add(Locale.SIMPLIFIED_CHINESE);
            candidates.add(Locale.CHINESE);
            candidates.add(Locale.forLanguageTag("zh-Hans-CN"));
            candidates.add(Locale.forLanguageTag("cmn-CN"));
        }
        for (Locale candidate : candidates) {
            if (candidate == null || candidate.getLanguage() == null || candidate.getLanguage().isEmpty()) continue;
            if (isAvailable(candidate)) return candidate;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && !base.isEmpty()) {
            try {
                for (Locale candidate : textToSpeech.getAvailableLanguages()) {
                    if (candidate == null || candidate.getLanguage() == null) continue;
                    if (base.equals(baseLanguage(candidate.getLanguage())) && isAvailable(candidate)) return candidate;
                }
            } catch (Exception ignored) { /* Some engines throw on getAvailableLanguages(). */ }
        }
        return null;
    }

    private boolean isAvailable(Locale locale) {
        try {
            return textToSpeech.isLanguageAvailable(locale) >= TextToSpeech.LANG_AVAILABLE;
        } catch (Exception ignored) {
            return false;
        }
    }

    private void finishCall(String utteranceId, String error) {
        PluginCall call = pendingCalls.remove(utteranceId);
        if (call == null) return;
        call.setKeepAlive(false);
        if (error == null) call.resolve();
        else call.reject(error);
    }

    @Override
    protected void handleOnDestroy() {
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
        }
        super.handleOnDestroy();
    }
}
