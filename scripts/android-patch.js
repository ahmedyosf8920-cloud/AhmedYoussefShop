/* يضيف صلاحيات أندرويد اللازمة (موقع/إشعارات/منبهات دقيقة) ويبدّل أيقونة التطبيق بعد cap add android */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), app = path.join(root, 'android', 'app', 'src', 'main');
const mf = path.join(app, 'AndroidManifest.xml');
if (!fs.existsSync(mf)) { console.error('مجلد android غير موجود. نفّذ: npm run android:init'); process.exit(1); }
let x = fs.readFileSync(mf, 'utf8');
const perms = ['INTERNET', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'POST_NOTIFICATIONS', 'SCHEDULE_EXACT_ALARM', 'USE_EXACT_ALARM', 'RECEIVE_BOOT_COMPLETED', 'VIBRATE', 'WAKE_LOCK'];
for (const p of perms) if (!x.includes('android.permission.' + p + '"')) x = x.replace('</manifest>', '    <uses-permission android:name="android.permission.' + p + '" />\n</manifest>');
if (!x.includes('com.whatsapp.w4b')) x = x.replace('</manifest>', '    <queries>\n        <package android:name="com.whatsapp.w4b" />\n        <package android:name="com.whatsapp" />\n    </queries>\n</manifest>');
fs.writeFileSync(mf, x);
/* جسر واتساب بيزنس: يفتح الرسالة في WhatsApp Business أولًا ثم واتساب العادي */
const jd = path.join(app, 'java', 'com', 'ahmedyoussef', 'central');
fs.mkdirSync(jd, { recursive: true });
fs.writeFileSync(path.join(jd, 'WaBusinessPlugin.java'), `package com.ahmedyoussef.central;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WaBusiness")
public class WaBusinessPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url");
        if (url == null) { call.reject("no url"); return; }
        String[] pkgs = new String[] { "com.whatsapp.w4b", "com.whatsapp" };
        for (String p : pkgs) {
            try {
                Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                i.setPackage(p);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
                JSObject r = new JSObject();
                r.put("package", p);
                call.resolve(r);
                return;
            } catch (Exception e) { /* جرّب التطبيق التالي */ }
        }
        call.reject("whatsapp not installed");
    }
}
`);
fs.writeFileSync(path.join(jd, 'MainActivity.java'), `package com.ahmedyoussef.central;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WaBusinessPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`);
const res = path.join(app, 'res'), icon = path.join(root, 'icon-192.png');
fs.rmSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true, force: true });
for (const d of fs.readdirSync(res).filter(d => d.startsWith('mipmap-')))
  for (const n of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) fs.copyFileSync(icon, path.join(res, d, n));
console.log('تم تعديل AndroidManifest والأيقونات');
