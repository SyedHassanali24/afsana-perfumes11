// Parse-checks every .js/.jsx file under src/ and admin/ (catches JSX typos without installing Vite/npm).
// Usage: node tools/check-syntax.js          (needs the `typescript` package: npm i -D typescript, or a global install)
const fs = require('fs'); const path = require('path');
let ts;
for (const p of ['typescript', path.join(process.env.HOME || '', '.npm-global/lib/node_modules/typescript'), '/usr/lib/node_modules/typescript', '/usr/local/lib/node_modules/typescript']) {
  try { ts = require(p); break; } catch { /* try next */ }
}
if (!ts) { console.log('typescript not found: run `npm i -D typescript` (or `npm i -g typescript`) first.'); process.exit(2); }

const files = [];
const walk = (dir) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) walk(p); else if (/\.jsx?$/.test(f.name)) files.push(p); } };
['src', 'admin'].filter(fs.existsSync).forEach(walk);

let bad = 0;
for (const f of files) {
  const r = ts.transpileModule(fs.readFileSync(f, 'utf8'), { fileName: f, reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
  for (const d of r.diagnostics || []) { bad += 1; console.log(`${f}:${d.file.getLineAndCharacterOfPosition(d.start).line + 1} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`); }
}
console.log(bad ? `${bad} syntax error(s)` : `OK: ${files.length} files parse`);
process.exit(bad ? 1 : 0);
