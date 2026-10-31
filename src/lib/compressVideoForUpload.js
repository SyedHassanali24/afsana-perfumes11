const TARGET_BYTES = 3.2 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 3.8 * 1024 * 1024;
const MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4'
];

function supportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function even(value) {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 ? rounded - 1 : rounded;
}

function recordOnce(sourceUrl, options, onProgress) {
  return new Promise(async (resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.style.cssText = 'position:fixed;left:-10000px;top:0;width:2px;height:2px;opacity:0;pointer-events:none;';
    document.body.appendChild(video);

    let sourceStream;
    let outputStream;
    let recorder;
    let raf = 0;
    let timeoutId;
    let settled = false;

    const cleanup = () => {
      if (raf) cancelAnimationFrame(raf);
      if (timeoutId) clearTimeout(timeoutId);
      try { video.pause(); } catch {}
      [outputStream, sourceStream].filter(Boolean).forEach((stream) => {
        stream.getTracks().forEach((track) => { try { track.stop(); } catch {} });
      });
      video.removeAttribute('src');
      try { video.load(); } catch {}
      video.remove();
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch {}
      cleanup();
      reject(error instanceof Error ? error : new Error('Video optimization failed.'));
    };

    video.addEventListener('error', () => fail(new Error('This video format could not be opened by the browser. Try MP4 or WebM.')), { once: true });
    video.src = sourceUrl;
    video.load();

    try {
      await new Promise((resolveMetadata, rejectMetadata) => {
        if (video.readyState >= 1 && video.videoWidth) return resolveMetadata();
        video.addEventListener('loadedmetadata', resolveMetadata, { once: true });
        video.addEventListener('error', () => rejectMetadata(new Error('This video format could not be opened by the browser. Try MP4 or WebM.')), { once: true });
      });

      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0 || !video.videoWidth || !video.videoHeight) {
        throw new Error('This video has no readable duration or dimensions.');
      }

      const capture = video.captureStream || video.mozCaptureStream;
      if (!capture || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
        throw new Error('Automatic video optimization is not supported by this browser. Please use the latest Chrome or Edge.');
      }

      const targetTotalBitrate = Math.max(
        48_000,
        Math.floor((TARGET_BYTES * 8 / duration) * options.qualityScale)
      );
      const audioBitrate = duration > 180 ? 24_000 : duration > 60 ? 40_000 : 64_000;
      const videoBitrate = Math.max(24_000, targetTotalBitrate - audioBitrate);
      const maxEdge = Math.min(options.maxEdge, videoBitrate >= 420_000 ? 1280 : videoBitrate >= 170_000 ? 960 : 640);
      const ratio = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
      const width = even(video.videoWidth * ratio);
      const height = even(video.videoHeight * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('The browser could not prepare this video for optimization.');

      sourceStream = capture.call(video);
      const audioTracks = sourceStream.getAudioTracks();
      outputStream = canvas.captureStream(24);
      audioTracks.forEach((track) => outputStream.addTrack(track));

      const mimeType = supportedMimeType();
      if (!mimeType) throw new Error('This browser cannot encode a web-ready MP4/WebM video. Please use the latest Chrome or Edge.');

      try {
        recorder = new MediaRecorder(outputStream, {
          mimeType,
          videoBitsPerSecond: videoBitrate,
          audioBitsPerSecond: audioBitrate
        });
      } catch {
        recorder = new MediaRecorder(outputStream, { mimeType });
      }

      const chunks = [];
      const recording = new Promise((resolveRecording, rejectRecording) => {
        recorder.addEventListener('dataavailable', (event) => {
          if (event.data && event.data.size) chunks.push(event.data);
        });
        recorder.addEventListener('error', () => rejectRecording(new Error('The browser stopped while optimizing this video. Try a shorter clip.')), { once: true });
        recorder.addEventListener('stop', () => {
          const type = recorder.mimeType || mimeType;
          resolveRecording(new Blob(chunks, { type: type.split(';')[0] || 'video/webm' }));
        }, { once: true });

        const draw = () => {
          if (video.readyState >= 2) {
            try { context.drawImage(video, 0, 0, width, height); } catch {}
          }
          if (!video.ended && !settled) raf = requestAnimationFrame(draw);
        };

        video.addEventListener('timeupdate', () => {
          if (duration > 0) onProgress?.(Math.min(99, Math.round((video.currentTime / duration) * 100)));
        });

        video.addEventListener('ended', () => {
          if (recorder.state !== 'inactive') recorder.stop();
        }, { once: true });

        recorder.start(1000);
        video.play().then(() => { draw(); }).catch(() => rejectRecording(new Error('The browser could not play this video for optimization.')));
        timeoutId = setTimeout(() => rejectRecording(new Error('Video optimization took too long. Try a shorter clip.')), Math.max(90_000, duration * 1000 + 60_000));
      });

      const blob = await recording;
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ blob, duration, width, height, videoBitrate, audioBitrate });
    } catch (error) {
      fail(error);
    }
  });
}

export default async function compressVideoForUpload(file, onProgress) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Video optimization is only available in a browser.');
  }
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Automatic video optimization needs the latest Chrome or Edge.');
  }

  const sourceUrl = URL.createObjectURL(file);
  const attempts = [
    { maxEdge: 1280, qualityScale: 0.88 },
    { maxEdge: 960, qualityScale: 0.68 },
    { maxEdge: 640, qualityScale: 0.5 }
  ];

  try {
    let lastSize = 0;
    for (let index = 0; index < attempts.length; index += 1) {
      onProgress?.({ attempt: index + 1, percent: 0, stage: 'Optimizing video' });
      const result = await recordOnce(sourceUrl, attempts[index], (percent) => {
        onProgress?.({ attempt: index + 1, percent, stage: 'Optimizing video' });
      });
      lastSize = result.blob.size;
      if (lastSize <= MAX_OUTPUT_BYTES) {
        const contentType = result.blob.type.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';
        const extension = contentType === 'video/mp4' ? 'mp4' : 'webm';
        const baseName = String(file.name || 'afsana-video').replace(/\.[^.]+$/, '').slice(0, 90);
        return {
          blob: result.blob,
          contentType,
          filename: baseName + '-optimized.' + extension,
          originalSize: file.size,
          optimizedSize: result.blob.size
        };
      }
    }
    throw new Error(
      'This video is too long or complex for the secure upload limit. Please trim it to a shorter product clip and upload again.'
    );
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
