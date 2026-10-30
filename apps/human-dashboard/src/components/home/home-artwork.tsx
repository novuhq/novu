'use client';

import { useEffect, useRef, useState } from 'react';
import { MascotFace } from '@/components/ui/mascot-face';
import { HOME_MASCOT_MESSAGES } from '@/data/home';

const TYPE_MS = 34;
const HOLD_MS = 3400;
const BEAMS_MS = 1400;

/**
 * The mascot, drawn for paper in a viewer pane on a drafting grid, with the latest reply from a human in a
 * speech bubble.
 * Replies type in one after another; with reduced motion the first one stays put.
 */
export function HomeArtwork() {
  const figure = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const message = HOME_MASCOT_MESSAGES[index];
  const [typed, setTyped] = useState<number>(message.text.length);
  const [beaming, setBeaming] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener('change', apply);

    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const node = figure.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) {
      setTyped(HOME_MASCOT_MESSAGES[index].text.length);
      setBeaming(false);

      return;
    }
    if (!visible) return;

    const text = HOME_MASCOT_MESSAGES[index].text;
    const timers: number[] = [];
    if (typed < text.length) {
      timers.push(window.setTimeout(() => setTyped(typed + 1), TYPE_MS));
    } else {
      setBeaming(true);
      timers.push(window.setTimeout(() => setBeaming(false), BEAMS_MS));
      timers.push(
        window.setTimeout(() => {
          setIndex((current) => (current + 1) % HOME_MASCOT_MESSAGES.length);
          setTyped(0);
        }, HOLD_MS)
      );
    }

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [index, typed, reduced, visible]);

  const typing = typed < message.text.length;

  return (
    <figure ref={figure} className="home-artwork" aria-label="Agent Inbox mascot">
      <span aria-hidden="true" className="home-artwork-grid" />
      <span aria-hidden="true" className="home-artwork-marks" />
      <span aria-hidden="true" className="home-artwork-label" data-corner="top">
        FIG. 01 — AGENT
      </span>
      <span aria-hidden="true" className="home-artwork-label" data-corner="bottom">
        {String(index + 1).padStart(2, '0')}/{String(HOME_MASCOT_MESSAGES.length).padStart(2, '0')} REPLIES
      </span>
      <span aria-hidden="true" className="home-artwork-stage">
        <MascotFace
          art="poster"
          paper
          still={!visible || reduced}
          mood={beaming ? 'happy' : 'awake'}
          className="home-artwork-media"
        />
        <span className="home-bubble">
          <span className="home-bubble-from">
            {message.from} <span className="home-bubble-via">via {message.via}</span>
          </span>
          <span className="home-bubble-text">
            {'> '}
            {message.text.slice(0, typed)}
            <span className="home-bubble-caret" data-typing={typing || undefined} />
          </span>
        </span>
      </span>
    </figure>
  );
}
