/* يجهّز مجلد www: ينسخ البرنامج، ويحمّل مكتبتي Supabase و XLSX محليًا ليعمل البرنامج بدون إنترنت */
const fs = require('fs'), path = require('path'), https = require('https');
const strict = process.argv.includes('--strict');
const root = path.join(__dirname, '..'), src = root, out = path.join(root, 'www');
const VENDOR = [
  { url: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4', file: 'supabase.js' },
  { url: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', file: 'xlsx.full.min.js' }
];
function get(url, n = 0) {
  return new Promise((res, rej) => {
    const rq = https.get(url, { headers: { 'User-Agent': 'node' } }, r => {
      if ([301, 302, 307, 308].includes(r.statusCode) && r.headers.location && n < 5) return res(get(new URL(r.headers.location, url).toString(), n + 1));
      if (r.statusCode !== 200) return rej(new Error('HTTP ' + r.statusCode));
      const b = []; r.on('data', d => b.push(d)); r.on('end', () => res(Buffer.concat(b)));
    });
    rq.on('error', rej); rq.setTimeout(30000, () => rq.destroy(new Error('timeout')));
  });
}
const SKIP = new Set(['desktop', 'scripts', 'build', 'android', 'www', 'dist', 'node_modules', '.github', 'vendor-cache', 'package.json', 'package-lock.json', 'capacitor.config.json', 'store_schema.sql', 'build-windows.bat', '.gitignore']);
function copyDir(a, b, top = true) {
  fs.mkdirSync(b, { recursive: true });
  for (const f of fs.readdirSync(a)) {
    if (top && (SKIP.has(f) || /^README|^اقرأني|\.zip$/i.test(f))) continue;
    const s = path.join(a, f), d = path.join(b, f);
    fs.statSync(s).isDirectory() ? copyDir(s, d, false) : fs.copyFileSync(s, d);
  }
}
(async () => {
  fs.rmSync(out, { recursive: true, force: true });
  copyDir(src, out);
  fs.mkdirSync(path.join(out, 'vendor'), { recursive: true });
  const ok = [];
  for (const v of VENDOR) {
    const dest = path.join(out, 'vendor', v.file), cache = path.join(root, 'vendor-cache', v.file);
    try {
      let buf;
      if (fs.existsSync(cache)) buf = fs.readFileSync(cache);
      else { buf = await get(v.url); fs.mkdirSync(path.dirname(cache), { recursive: true }); fs.writeFileSync(cache, buf); }
      if (buf.length < 10000 || buf.slice(0, 1).toString() === '<') throw new Error('ملف غير صالح');
      fs.writeFileSync(dest, buf); ok.push(v);
      console.log('✔ vendor', v.file, Math.round(buf.length / 1024) + 'KB');
    } catch (e) {
      console.warn('✖ تعذر تحميل', v.file, '-', e.message);
      if (strict) { console.error('وضع --strict: يلزم إنترنت لتحميل المكتبات مرة واحدة'); process.exit(1); }
    }
  }
  for (const f of ['index.html']) {
    const p = path.join(out, f); if (!fs.existsSync(p)) continue;
    let t = fs.readFileSync(p, 'utf8');
    for (const v of ok) t = t.split(v.url).join('vendor/' + v.file);
    fs.writeFileSync(p, t);
  }
  console.log('www جاهز. مكتبات محلية:', ok.length + '/' + VENDOR.length);
})();
