import { useRef, useState } from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';
import Button from './Button';
import { mediaApi } from '../../src/services';
import shrinkImage from '../../src/lib/shrinkImage';
import { MEDIA_MAX_BYTES } from '../../shared/mediaLimits.mjs';

const TYPE_BY_EXTENSION = {
  glb: 'model/gltf-binary',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  ogv: 'video/ogg',
  '3gp': 'video/3gpp'
};
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(new Error('The selected file could not be read.'));
    reader.readAsDataURL(file);
  });
}

export default function MediaUploadButton({ onUploaded, accept='image/*,video/mp4,video/webm,.glb', label='Upload media', className='' }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const [progress, setProgress] = useState('');

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true); setError(''); setUploaded(false); setProgress('');
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const originalType = TYPE_BY_EXTENSION[ext] || file.type || '';
      const isVideo = originalType.startsWith('video/') || ['mp4','m4v','webm','mov','avi','mkv','ogv','3gp'].includes(ext);
      let payload;

      if (originalType.startsWith('image/')) {
        setProgress('Optimizing image…');
        const optimized = await shrinkImage(file);
        payload = { ...optimized, filename: file.name };
      } else if (isVideo) {
        if (!['video/mp4', 'video/webm'].includes(originalType)) {
          throw new Error('Please select an MP4 or WebM video. Other video formats are not supported yet.');
        }
        if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > MEDIA_MAX_BYTES) {
          throw new Error('Video must be smaller than 250 MiB. The original file is uploaded in chunks; manual compression is not required below this limit.');
        }
        setProgress('Uploading original video… 0%');
        const uploadedMedia = await mediaApi.uploadVideo(file, (percent) => {
          setProgress('Uploading original video… ' + percent + '%');
        });
        onUploaded?.(uploadedMedia.url);
        setUploaded(true);
        setProgress('');
        return;
      } else {
        setProgress('Uploading media…');
        payload = { filename: file.name, contentType: originalType, data: await toBase64(file) };
      }

      const result = await mediaApi.upload(payload);
      onUploaded?.(result.url);
      setUploaded(true);
      setProgress('');
    } catch (e) {
      setError(e.message || 'Upload failed. Please try a valid MP4/WebM video under 250 MiB.');
      setProgress('');
    } finally { setBusy(false); }
  };

  return <div className={'flex flex-wrap items-center gap-2 '+className}>
    <input ref={ref} type="file" accept={accept} className="hidden" onChange={pick} />
    <Button type="button" variant="secondary" size="sm" icon={Upload} disabled={busy} onClick={() => ref.current?.click()}>{busy ? 'Working…' : label}</Button>
    {busy && progress && <span className="text-xs text-[#5f654f]" aria-live="polite">{progress}</span>}
    {uploaded && <span className="inline-flex items-center gap-1 text-xs text-[#3d6b35]"><CheckCircle2 className="h-3.5 w-3.5"/> Uploaded</span>}
    {error && <span role="alert" className="text-xs text-[#9b3f3f]">{error}</span>}
  </div>;
}
