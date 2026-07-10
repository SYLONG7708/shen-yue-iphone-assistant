package tw.com.shenyue.assistant;

import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

final class SecureUpdateBridge {
    private final UpdateBridge delegate;
    private final byte[] expectedToken;
    private final Map<String, Method> allowedMethods = new HashMap<>();

    SecureUpdateBridge(UpdateBridge delegate, String sessionToken) {
        this.delegate = delegate;
        this.expectedToken = bytes(sessionToken);
        for (Method method : UpdateBridge.class.getMethods()) {
            if (method.getAnnotation(JavascriptInterface.class) == null) continue;
            boolean supported = true;
            for (Class<?> parameter : method.getParameterTypes()) {
                if (parameter != String.class) {
                    supported = false;
                    break;
                }
            }
            if (supported) allowedMethods.put(key(method.getName(), method.getParameterTypes().length), method);
        }
    }

    @JavascriptInterface
    public String invoke(String sessionToken, String methodName, String argumentsJson) {
        if (!MessageDigest.isEqual(expectedToken, bytes(sessionToken))) {
            return error("原生橋接授權失敗，請重新開啟申悅車機助手。");
        }
        try {
            JSONArray arguments = new JSONArray(argumentsJson == null || argumentsJson.length() == 0 ? "[]" : argumentsJson);
            Method method = allowedMethods.get(key(methodName, arguments.length()));
            if (method == null) return error("此原生能力不存在或參數數量不正確：" + methodName);
            Object[] values = new Object[arguments.length()];
            for (int index = 0; index < arguments.length(); index += 1) {
                Object value = arguments.opt(index);
                values[index] = value == null || value == JSONObject.NULL ? "" : String.valueOf(value);
            }
            Object result = method.invoke(delegate, values);
            return result == null ? "" : String.valueOf(result);
        } catch (InvocationTargetException error) {
            Throwable cause = error.getCause() == null ? error : error.getCause();
            return error(message(cause));
        } catch (Exception error) {
            return error(message(error));
        }
    }

    private String key(String name, int arguments) {
        return (name == null ? "" : name) + "#" + arguments;
    }

    private String error(String message) {
        try {
            JSONObject result = new JSONObject();
            result.put("ok", false);
            result.put("message", message == null ? "原生橋接執行失敗" : message);
            return result.toString();
        } catch (Exception ignored) {
            return "{\"ok\":false,\"message\":\"Native bridge failed\"}";
        }
    }

    private String message(Throwable error) {
        if (error == null) return "原生橋接執行失敗";
        String value = error.getMessage();
        return value == null || value.length() == 0 ? error.getClass().getSimpleName() : value;
    }

    private static byte[] bytes(String value) {
        return (value == null ? "" : value).getBytes(StandardCharsets.UTF_8);
    }
}
