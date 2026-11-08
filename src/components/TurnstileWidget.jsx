import { useEffect, useRef, useState } from 'react';

const SITE_KEY = '0x4AAAAAAF06iSkhZh8g9mEb';
let scriptPromise;

function loadTurnstile() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser unavailable.'));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-afsana-turnstile]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.turnstile), { once: true });
        existing.addEventListener('error', () => reject(new Error('Security check could not load.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.afsanaTurnstile = 'true';
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => reject(new Error('Security check could not load.'));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export default function TurnstileWidget({ action, onToken, resetKey = 0 }) {
  const container = useRef(null);
  const widgetId = useRef(null);
  const onTokenRef = useRef(onToken);
  const [error, setError] = useState('');

  useEffect(() => { onTokenRef.current = onToken; }, [onToken]);

  useEffect(() => {
    let cancelled = false;
    let renderedId = null;
    setError('');
    onTokenRef.current?.('');

    loadTurnstile().then((api) => {
      if (cancelled || !container.current || !api) return;
      renderedId = api.render(container.current, {
        sitekey: SITE_KEY,
        action,
        theme: 'light',
        size: 'flexible',
        retry: 'auto',
        'refresh-expired': 'auto',
        callback: (token) => onTokenRef.current?.(token),
        'expired-callback': () => onTokenRef.current?.(''),
        'error-callback': () => {
          onTokenRef.current?.('');
          setError('Security check failed to load. Please refresh and try again.');
        },
      });
      widgetId.current = renderedId;
    }).catch(() => {
      if (!cancelled) setError('Security check could not load. Please check your connection and reload the page.');
    });

    return () => {
      cancelled = true;
      if (renderedId && window.turnstile) {
        try { window.turnstile.remove(renderedId); } catch { /* widget may already be removed */ }
      }
      if (widgetId.current === renderedId) widgetId.current = null;
      onTokenRef.current?.('');
    };
  }, [action, resetKey]);

  return (
    <div className="space-y-1">
      <div ref={container} className="min-h-[66px]" />
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
