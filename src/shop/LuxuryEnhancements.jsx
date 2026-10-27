import { useEffect, useRef } from 'react';

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: ((i * 37) % 100),
  top: ((i * 61) % 100),
  delay: (i % 7) * 0.8,
  duration: 7 + (i % 5),
  size: 2 + (i % 3),
}));

export default function LuxuryEnhancements() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onPointer = (event) => {
      root.style.setProperty('--mx', `${event.clientX}px`);
      root.style.setProperty('--my', `${event.clientY}px`);
    };

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      root.style.setProperty('--scroll-progress', max > 0 ? `${(window.scrollY / max) * 100}%` : '0%');
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('afsana-visible');
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    root.querySelectorAll('[data-luxury-reveal]').forEach((el) => observer.observe(el));

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={rootRef} className="afsana-enhancement-layer" aria-hidden="true">
      <div className="afsana-cursor-aura" />
      <div className="afsana-scroll-line" />
      <div className="afsana-particles">
        {PARTICLES.map((particle) => (
          <span
            key={particle.id}
            className="afsana-particle"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: particle.size,
              height: particle.size,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
