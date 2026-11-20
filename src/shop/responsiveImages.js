// Responsive delivery for public Unsplash-hosted AFSANA imagery.
// User-uploaded and other third-party URLs are deliberately left untouched.
export function responsiveUnsplashSrcSet(source, quality = 68) {
  if (!source || typeof source !== 'string') return undefined;
  try {
    const original = new URL(source);
    if (original.protocol !== 'https:' || original.hostname !== 'images.unsplash.com') return undefined;
    const widths = [320, 480, 640, 768, 960, 1280];
    return widths.map((width) => {
      const candidate = new URL(original);
      candidate.searchParams.set('auto', 'format');
      candidate.searchParams.set('w', String(width));
      candidate.searchParams.set('q', String(Math.max(50, Math.min(82, Number(quality) || 68))));
      return `${candidate.toString()} ${width}w`;
    }).join(', ');
  } catch {
    return undefined;
  }
}
