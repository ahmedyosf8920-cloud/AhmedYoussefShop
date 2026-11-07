/* يضيف صلاحيات أندرويد اللازمة (موقع/إشعارات/منبهات دقيقة) ويبدّل أيقونة التطبيق بعد cap add android */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), app = path.join(root, 'android', 'app', 'src', 'main');
const mf = path.join(app, 'AndroidManifest.xml');
if (!fs.existsSync(mf)) { console.error('مجلد android غير موجود. نفّذ: npm run android:init'); process.exit(1); }
let x = fs.readFileSync(mf, 'utf8');
const perms = ['INTERNET', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'POST_NOTIFICATIONS', 'SCHEDULE_EXACT_ALARM', 'USE_EXACT_ALARM', 'RECEIVE_BOOT_COMPLETED', 'VIBRATE', 'WAKE_LOCK'];
for (const p of perms) if (!x.includes('android.permission.' + p + '"')) x = x.replace('</manifest>', '    <uses-permission android:name="android.permission.' + p + '" />\n</manifest>');
fs.writeFileSync(mf, x);
const res = path.join(app, 'res'), icon = path.join(root, 'icon-192.png');
fs.rmSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true, force: true });
for (const d of fs.readdirSync(res).filter(d => d.startsWith('mipmap-')))
  for (const n of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) fs.copyFileSync(icon, path.join(res, d, n));
console.log('تم تعديل AndroidManifest والأيقونات');
