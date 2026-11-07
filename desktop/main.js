/* سنترال أحمد يوسف — نسخة سطح المكتب (ويندوز). تعمل بدون إنترنت، وتبقى في شريط المهام ليعمل الأذان والتنبيهات. */
const { app, BrowserWindow, Tray, Menu, protocol, net, shell, nativeImage } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.setAppUserModelId('com.ahmedyoussef.central');

const WWW = path.join(__dirname, '..', 'www');
const ICON = path.join(__dirname, '..', 'build', 'icon.png');
let win = null, tray = null, quitting = false;

if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });
  app.whenReady().then(() => {
    protocol.handle('app', req => {
      let p = decodeURIComponent(new URL(req.url).pathname);
      if (p === '/' || p === '') p = '/index.html';
      const f = path.normalize(path.join(WWW, p));
      if (!f.startsWith(WWW)) return new Response('forbidden', { status: 403 });
      return net.fetch(pathToFileURL(f).toString());
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
