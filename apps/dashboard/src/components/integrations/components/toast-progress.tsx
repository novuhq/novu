import { useEffect, useState } from 'react';

/** Bar along the toast's bottom edge that drains while the toast is shown. */
export function ToastProgress({ durationMs }: { durationMs: number }) {
  const [isDraining, setIsDraining] = useState(false);

  useEffect(() => {
    // Start on the next frame, so the width transitions from full instead of rendering empty.
    const frame = requestAnimationFrame(() => setIsDraining(true));

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <span
      aria-hidden="true"
      className="bg-primary-base absolute bottom-0 left-0 h-0.5 ease-linear"
      style={{ width: isDraining ? '0%' : '100%', transitionProperty: 'width', transitionDuration: `${durationMs}ms` }}
    />
  );
}
