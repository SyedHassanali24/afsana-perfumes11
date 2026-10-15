// Shrinks a picture in the browser BEFORE upload (phone photos are 3-8 MB; we send ~150-400 KB). Returns { contentType, data(base64), filename }.
const MAX_SIDE = 1400;
const MAX_BYTES = 600 * 1024;

const toBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1]);
  r.onerror = () => reject(new Error('The picture could not be read.'));
  r.readAsDataURL(blob);
});

export default async function shrinkImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Only JPEG, PNG or WebP pictures are allowed.');
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { throw new Error('This picture could not be opened.'); }
  let scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  let quality = 0.86;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const w = Math.max(1, Math.round(bmp.width * scale)); const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); // transparent PNGs get a white background (JPEG has none)
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('This picture could not be processed.');
    if (blob.size <= MAX_BYTES) return { contentType: 'image/jpeg', data: await toBase64(blob), filename: file.name.replace(/\.[^.]+$/, '') + '.jpg' };
    if (quality > 0.6) quality -= 0.1; else scale *= 0.8; // first lower quality, then make it smaller
  }
  throw new Error('This picture is too large even after shrinking. Try a smaller one.');
}
