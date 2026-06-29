import { useEffect, useRef, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { createPortal } from 'react-dom';

type ConnectionConfettiProps = {
  /** Fires a single celebratory burst the first time this becomes `true`. */
  active: boolean;
  /** Number of confetti pieces in the burst. */
  numberOfPieces?: number;
  /** How long the burst stays mounted before it is cleared, in milliseconds. */
  durationMs?: number;
};

/**
 * One-shot confetti burst portaled over the whole viewport. Used to carry the connection
 * "success" celebration from the setup guide into the connected / "What's next" view so the
 * moment isn't dropped when the setup card animates away. Fires at most once per mount.
 */
export function ConnectionConfetti({ active, numberOfPieces = 600, durationMs = 6000 }: ConnectionConfettiProps) {
  const [isVisible, setIsVisible] = useState(false);
  const hasFiredRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || hasFiredRef.current) {
      return;
    }

    hasFiredRef.current = true;
    setIsVisible(true);

    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      setIsVisible(false);
    }, durationMs);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [active, durationMs]);

  if (!isVisible) {
    return null;
  }

  return createPortal(
    <ReactConfetti
      width={window.innerWidth}
      height={window.innerHeight}
      recycle={false}
      numberOfPieces={numberOfPieces}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10000,
      }}
    />,
    document.body
  );
}
