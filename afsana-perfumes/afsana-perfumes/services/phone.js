// Pakistan-friendly phone normalisation: 0300-1234567 / 92 300 1234567 / +923001234567 -> +923001234567
function normalizePhone(input) {
  let p = String(input || '').replace(/[\s\-().]/g, '');
  if (/^03\d{9}$/.test(p)) p = `+92${p.slice(1)}`;
  else if (/^923\d{9}$/.test(p)) p = `+${p}`;
  return p;
}
module.exports = { normalizePhone };
