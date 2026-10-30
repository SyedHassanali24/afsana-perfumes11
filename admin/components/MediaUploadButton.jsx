import { useRef, useState } from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';
import Button from './Button';
import { mediaApi } from '../../src/services';
import shrinkImage from '../../src/lib/shrinkImage';

const TYPE_BY_EXTENSION = { glb:'model/gltf-binary', mp4:'video/mp4', webm:'video/webm' };

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(new Error('The selected file could not be read.'));
    reader.readAsDataURL(file);
  });
}

export default function MediaUploadButton({ onUploaded, accept='image/*', label='Upload media', className='' }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState(false);

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true); setError(''); setUploaded(false);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const contentType = file.type || TYPE_BY_EXTENSION[ext] || '';
      const payload = contentType.startsWith('image/')
        ? await shrinkImage(file)
        : { filename: file.name, contentType, data: await toBase64(file) };
      const result = await mediaApi.upload(payload);
      onUploaded?.(result.url);
      setUploaded(true);
    } catch (e) {
      setError(e.message || 'Upload failed. Try a smaller file or paste a hosted URL.');
    } finally { setBusy(false); }
  };

  return <div className={'flex flex-wrap items-center gap-2 '+className}>
    <input ref={ref} type="file" accept={accept} className="hidden" onChange={pick} />
    <Button type="button" variant="secondary" size="sm" icon={Upload} disabled={busy} onClick={() => ref.current?.click()}>{busy ? 'Uploading…' : label}</Button>
    {uploaded && <span className="inline-flex items-center gap-1 text-xs text-[#3d6b35]"><CheckCircle2 className="h-3.5 w-3.5"/> Uploaded</span>}
    {error && <span role="alert" className="text-xs text-[#9b3f3f]">{error}</span>}
  </div>;
}
