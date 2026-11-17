package in.yawmi.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FocusLivePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
