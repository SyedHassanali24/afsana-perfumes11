// Pakistan-friendly phone normalisation: 0300-1234567 / 92 300 1234567 / +923001234567 -> +923001234567
function normalizePhone(input) {
  let p = String(input || '').replace(/[\s\-().]/g, '');
  if (/^03\d{9}$/.test(p)) p = `+92${p.slice(1)}`;
  else if (/^923\d{9}$/.test(p)) p = `+${p}`;
  return p;
}
// Do two phone numbers written in different styles belong to the same Pakistani mobile? "0300 1234567" = "03001234567" = "+92 300 1234567" = "923001234567".
// Compares the last 10 digits; anything shorter than 10 digits never matches (so blanks and junk cannot match each other).
function samePhone(a, b) {
  const tail = (x) => { const d = String(x || '').replace(/\D/g, ''); return d.length >= 10 ? d.slice(-10) : null; };
  const x = tail(a); const y = tail(b);
  return x !== null && x === y;
}
module.exports = { normalizePhone, samePhone };
