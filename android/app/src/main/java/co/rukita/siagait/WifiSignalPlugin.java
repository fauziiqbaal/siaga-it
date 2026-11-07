package co.rukita.siagait;

import android.Manifest;
import android.content.Context;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Baca RSSI Wi-Fi (dBm) dari sensor HP.
 *
 * Browser tidak punya API untuk ini, jadi hanya tersedia di APK Android.
 * Tidak ada estimasi: kalau Android tidak memberi RSSI, hasilnya
 * `supported=false` dan teknisi mengisi dBm manual.
 *
 * Izin: ACCESS_FINE_LOCATION (wajib sejak Android 6 untuk info Wi-Fi) +
 * ACCESS_WIFI_STATE. Lokasi (GPS) harus aktif di perangkat.
 */
@CapacitorPlugin(
        name = "WifiSignal",
        permissions = {
                @Permission(alias = "location", strings = {Manifest.permission.ACCESS_FINE_LOCATION})
        }
)
public class WifiSignalPlugin extends Plugin {

    private static final String TAG = "WifiSignal";

    @PluginMethod
    public void getSignal(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "locationPermissionCallback");
            return;
        }
        resolveSignal(call);
    }

    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED) {
            resolveSignal(call);
        } else {
            JSObject result = new JSObject();
            result.put("supported", false);
            result.put("reason", "Izin lokasi ditolak. Android mewajibkan izin lokasi untuk membaca sinyal Wi-Fi.");
            call.resolve(result);
        }
    }

    private void resolveSignal(PluginCall call) {
        JSObject result = new JSObject();
        try {
            Context context = getContext().getApplicationContext();
            WifiManager wifiManager = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
            if (wifiManager == null) {
                result.put("supported", false);
                result.put("reason", "WifiManager tidak tersedia di perangkat ini.");
                call.resolve(result);
                return;
            }

            WifiInfo info = wifiManager.getConnectionInfo();
            if (info == null) {
                result.put("supported", false);
                result.put("reason", "Tidak ada koneksi Wi-Fi aktif.");
                call.resolve(result);
                return;
            }

            int rssi = info.getRssi();
            if (rssi >= 0 || rssi <= -127) {
                result.put("supported", false);
                result.put("reason", "HP tidak memberi RSSI (mungkin memakai data seluler, GPS mati, atau izin lokasi belum aktif).");
                call.resolve(result);
                return;
            }

            String ssid = info.getSSID();
            if (ssid == null || ssid.contains("<unknown ssid>")) {
                ssid = null;
            } else if (ssid.length() > 1 && ssid.startsWith("\"") && ssid.endsWith("\"")) {
                ssid = ssid.substring(1, ssid.length() - 1);
            }

            result.put("supported", true);
            result.put("dbm", rssi);
            if (ssid != null && !ssid.isEmpty()) {
                result.put("ssid", ssid);
            }
            result.put("frequencyMhz", info.getFrequency());
            result.put("linkSpeedMbps", info.getLinkSpeed());
            result.put("method", "WifiManager.getRssi()");
            call.resolve(result);
        } catch (SecurityException error) {
            result.put("supported", false);
            result.put("reason", "Izin Wi-Fi/lokasi belum aktif: " + error.getMessage());
            call.resolve(result);
        } catch (Exception error) {
            Log.e(TAG, "getSignal gagal", error);
            result.put("supported", false);
            result.put("reason", "Gagal membaca sinyal: " + error.getMessage());
            call.resolve(result);
        }
    }
}
