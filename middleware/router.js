function compile(routes) {
  return routes.map((r) => {
    const keys = [];
    const src = r.path.replace(/\/+$/, '').replace(/:([A-Za-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; });
    return { ...r, method: r.method.toUpperCase(), re: new RegExp(`^${src}/?$`), keys };
  });
}
// First match wins -> list static paths before dynamic ones.
function match(compiled, method, path) {
  for (const r of compiled) {
    if (r.method !== method) continue;
    const m = r.re.exec(path);
    if (m) return { route: r, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}
const stripPrefix = (path, group) => path.replace(new RegExp(`^/(?:\\.netlify/functions|api)/${group}`), '') || '/';
module.exports = { compile, match, stripPrefix };
