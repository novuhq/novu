'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { createDitherEffect, type DitherEffect, type DitherEffectSettings } from '@/vendor/interactive-dither/effect';
import settings from '@/vendor/interactive-dither/settings.json';

const SOURCE_IMAGE = '/media/home/agentinbox-dither.png';
/** The effect's first frame, for no JavaScript, reduced motion and while it loads. */
const POSTER = '/media/home/agentinbox-dither-poster.webp';

export function HomeArtwork() {
  const stage = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const container = stage.current;
    if (!container) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let controller: AbortController | null = null;
    let effect: DitherEffect | null = null;

    const stop = () => {
      controller?.abort();
      effect?.destroy();
      controller = null;
      effect = null;
      setLive(false);
    };
    const start = () => {
      if (controller) return;
      const current = new AbortController();
      controller = current;
      // The canvas backs each CSS pixel with DPR × renderScale pixels; two are
      // plenty for the 3px dither cells, so retina screens render at native size.
      const renderScale = Math.min(2, Math.max(1, 2 / (devicePixelRatio || 1)));
      createDitherEffect({
        container,
        imageUrl: SOURCE_IMAGE,
        settings: { ...settings, renderScale } as DitherEffectSettings,
        signal: current.signal,
      })
        .then((created) => {
          if (current.signal.aborted) return created.destroy();
          effect = created;
          created.canvas.setAttribute('aria-hidden', 'true');
          setLive(true);
        })
        // The poster stays up if the image or the canvas isn't available.
        .catch(() => undefined);
    };
    // Reduced motion keeps the poster and never downloads the source image.
    const synchronize = () => (motion.matches ? stop() : start());
    const onError = () => setLive(false);

    synchronize();
    motion.addEventListener('change', synchronize);
    container.addEventListener('dither-error', onError);
    return () => {
      motion.removeEventListener('change', synchronize);
      container.removeEventListener('dither-error', onError);
      stop();
    };
  }, []);

  return (
    <figure className="home-artwork" aria-label="Animated dither illustration">
      <Image
        src={POSTER}
        width={1187}
        height={1018}
        alt="Dithered illustration of a robot arm holding an agent's card"
        loading="eager"
        unoptimized
        className={live ? 'home-artwork-media invisible' : 'home-artwork-media'}
      />
      <div ref={stage} className="home-artwork-media" />
    </figure>
  );
}
