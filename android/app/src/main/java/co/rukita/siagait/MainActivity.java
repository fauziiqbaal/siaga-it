package co.rukita.siagait;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Daftarkan plugin pembaca RSSI sebelum bridge dibuat.
        registerPlugin(WifiSignalPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
