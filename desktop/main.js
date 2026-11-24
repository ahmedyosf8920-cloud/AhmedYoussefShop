/* سنترال أحمد يوسف — نسخة سطح المكتب (ويندوز). تعمل بدون إنترنت، وتبقى في شريط المهام ليعمل الأذان والتنبيهات. */
const { app, BrowserWindow, Tray, Menu, protocol, shell, nativeImage, session } = require('electron');
const path = require('path');
const fs = require('fs');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.setAppUserModelId('com.ahmedyoussef.central');

const WWW = path.join(__dirname, '..', 'www');
const ICON = path.join(__dirname, '..', 'build', 'icon.png');
let win = null, tray = null, quitting = false;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/wasm' };
function log(msg) { try { fs.appendFileSync(path.join(app.getPath('userData'), 'log.txt'), new Date().toISOString() + '  ' + msg + '\n'); } catch (e) { } }

if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });
  app.whenReady().then(() => {
    /* السماح بالكاميرا والإشعارات لهذا التطبيق فقط */
    session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(['media', 'notifications', 'fullscreen', 'clipboard-sanitized-write'].includes(permission)));
    session.defaultSession.setPermissionCheckHandler((wc, permission) => ['media', 'notifications', 'fullscreen', 'clipboard-sanitized-write'].includes(permission));
    /* تقديم ملفات البرنامج بقراءة fs (تعمل داخل app.asar مضمونًا) بدل net.fetch الذي قد يعطي شاشة بيضاء */
    protocol.handle('app', async req => {
      try {
        let p = decodeURIComponent(new URL(req.url).pathname);
        if (p === '/' || p === '') p = '/index.html';
        const f = path.normalize(path.join(WWW, p));
        if (!f.startsWith(WWW)) return new Response('forbidden', { status: 403 });
        const buf = await fs.promises.readFile(f);
        return new Response(buf, { status: 200, headers: { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' } });
      } catch (e) {
        log('تعذر قراءة ' + req.url + ' : ' + e.message);
        return new Response('not found: ' + req.url, { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
      }
    });
    createWindow();
    createTray();
  });
  app.on('before-quit', () => { quitting = true; });
  app.on('window-all-closed', () => { /* يبقى في شريط المهام */ });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 380, minHeight: 560,
    title: 'سنترال أحمد يوسف', icon: ICON, autoHideMenuBar: true, backgroundColor: '#f3f6fb',
    show: !process.argv.includes('--hidden'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, spellcheck: false, backgroundThrottling: false }
  });
  /* لو فشل تحميل الصفحة تظهر رسالة واضحة بدل الشاشة البيضاء، ويُسجَّل السبب في log.txt داخل مجلد بيانات البرنامج */
  win.webContents.on('did-fail-load', (e, code, desc, url, isMain) => {
    log('did-fail-load ' + code + ' ' + desc + ' ' + url);
    if (isMain) win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<meta charset="utf-8"><body style="font-family:Tahoma;direction:rtl;padding:40px"><h2>تعذر تحميل البرنامج</h2><p>' + desc + ' (' + code + ')</p><p style="color:#666;direction:ltr">' + url + '</p><button onclick="location.href=\'app://local/index.html\'" style="padding:10px 24px;font-size:16px">إعادة المحاولة</button><p>اضغط F12 لعرض التفاصيل.</p>'));
  });
  win.webContents.on('render-process-gone', (e, d) => log('render-process-gone ' + d.reason));
  win.webContents.on('console-message', (e, level, message, line, src) => { if (level >= 3) log('console.error: ' + message + ' @' + src + ':' + line); });
  win.webContents.on('before-input-event', (e, input) => { if (input.type === 'keyDown' && (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i'))) win.webContents.toggleDevTools(); });
  win.loadURL('app://local/index.html');
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|mailto:|tel:)/i.test(url) && !url.startsWith('app://')) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, icon: ICON } };
  });
  win.on('close', e => { if (!quitting) { e.preventDefault(); win.hide(); } });
}

function createTray() {
  const img = nativeImage.createFromPath(ICON).resize({ width: 24, height: 24 });
  tray = new Tray(img);
  tray.setToolTip('سنترال أحمد يوسف');
  const show = () => { win.show(); win.focus(); };
  const menu = () => Menu.buildFromTemplate([
    { label: 'فتح البرنامج', click: show },
    { label: 'تشغيل مع ويندوز (لتعمل مواقيت الصلاة والأذان تلقائيًا)', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: i => app.setLoginItemSettings({ openAtLogin: i.checked, args: ['--hidden'] }) },
    { type: 'separator' },
    { label: 'إغلاق نهائي', click: () => { quitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(menu());
  tray.on('click', () => (win.isVisible() ? win.hide() : show()));
}
