// Parse-checks every .js/.jsx file under src/ and admin/ (catches JSX typos without running Vite).
// Usage: node tools/check-syntax.js
// Uses `esbuild` (already installed with Vite). Falls back to the `typescript` package ONLY if it still has the old JS API
// (TypeScript 7+ is a native binary without one, so `npm i -D typescript` alone is no longer enough).
const fs = require('fs'); const path = require('path');
const tryRequire = (ps) => { for (const p of ps) { try { return require(p); } catch { /* try next */ } } return null; };

const esbuild = tryRequire(['esbuild']);
let ts = null;
if (!esbuild) {
  ts = tryRequire(['typescript', path.join(process.env.HOME || '', '.npm-global/lib/node_modules/typescript'), '/usr/lib/node_modules/typescript', '/usr/local/lib/node_modules/typescript']);
  if (ts && typeof ts.transpileModule !== 'function') ts = null;
}
if (!esbuild && !ts) { console.log('No parser found: run `npm i -D esbuild` (Vite already installs it) and try again.'); process.exit(2); }

const files = [];
const walk = (dir) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) walk(p); else if (/\.jsx?$/.test(f.name)) files.push(p); } };
['src', 'admin'].filter(fs.existsSync).forEach(walk);

let bad = 0;
for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  if (esbuild) {
    try { esbuild.transformSync(code, { loader: 'jsx', sourcefile: f, logLevel: 'silent' }); }
    catch (e) { for (const m of (e.errors || [{ text: e.message }])) { bad += 1; console.log(`${f}:${m.location ? m.location.line : '?'} ${m.text}`); } }
  } else {
    const r = ts.transpileModule(code, { fileName: f, reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
    for (const d of r.diagnostics || []) { bad += 1; console.log(`${f}:${d.file.getLineAndCharacterOfPosition(d.start).line + 1} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`); }
  }
}
console.log(bad ? `${bad} syntax error(s)` : `OK: ${files.length} files parse`);
process.exit(bad ? 1 : 0);
