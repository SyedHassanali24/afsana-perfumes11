import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import Button from './Button';
import { mediaApi } from '../../src/services';

const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const VIDEO_TYPES = ['video/mp4', 'video/webm'];

function encodeBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const parts = [];
  // Avoid a huge spread call while converting each 4 MiB slice to base64.
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    parts.push(String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)));
  }
  return btoa(parts.join(''));
}

function detectedType(file) {
  if (VIDEO_TYPES.includes(file.type)) return file.type;
  const name = String(file.name || '').toLowerCase();
  if (!file.type && name.endsWith('.mp4')) return 'video/mp4';
  if (!file.type && name.endsWith('.webm')) return 'video/webm';
  return '';
}

export default function VideoUploadButton({ onUploaded, label = 'Upload video' }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const contentType = detectedType(file);
    if (!contentType) {
      setError('Choose an MP4 or WebM video.');
      setMessage('');
      return;
    }
    if (!file.size || file.size > MAX_VIDEO_BYTES) {
      setError('Video must be between 1 byte and 250 MiB.');
      setMessage('');
      return;
    }

    setBusy(true);
    setProgress(0);
    setError('');
    setMessage('Preparing secure upload…');
    try {
      const session = await mediaApi.startVideoUpload({
        filename: file.name,
        contentType,
        size: file.size,
      });
      const { uploadId, chunkSize, chunkCount } = session;
      if (!uploadId || !Number.isInteger(chunkSize) || !Number.isInteger(chunkCount) || chunkSize < 1 || chunkCount < 1) {
        throw new Error('The upload session could not be started. Please try again.');
      }

      for (let index = 0; index < chunkCount; index += 1) {
        const start = index * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const data = encodeBase64(await file.slice(start, end).arrayBuffer());
        await mediaApi.uploadVideoChunk(uploadId, index, data);
        setProgress(Math.round(((index + 1) / chunkCount) * 100));
        setMessage(`Uploading video… ${index + 1} of ${chunkCount} parts`);
      }

      const completed = await mediaApi.completeVideoUpload(uploadId);
      if (!completed?.url) throw new Error('The video uploaded but its playback address was not returned.');
      onUploaded?.(completed.url, completed);
      setProgress(100);
      setMessage('Video uploaded. Save the homepage section to publish it.');
    } catch (uploadError) {
      setError(uploadError?.message || 'Video upload failed. Please try again.');
      setMessage('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,.mp4,.webm"
        className="hidden"
        onChange={pick}
        disabled={busy}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        icon={Upload}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? `Uploading… ${progress}%` : label}
      </Button>
      {message && <span role="status" className="text-xs text-[#5f654f]">{message}</span>}
      {error && <span role="alert" className="text-xs text-[#9b3f3f]">{error}</span>}
    </div>
  );
}
