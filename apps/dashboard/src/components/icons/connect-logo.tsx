import { useId } from 'react';

/**
 * Novu Connect brand mark — a soft gradient sphere matching Figma node `7302:35213` (the inner
 * "core" of the AppRail Connect tile). The Figma source layers ~8 blended bitmaps; this is a
 * lighter SVG approximation that captures the same brand colors (orange → magenta → indigo)
 * and the soft inner highlight without depending on raster assets.
 *
 * The viewBox matches the rendered size 1:1 so consumers can size the icon with `size-5`
 * (20px) and have the sphere fill the available space, mirroring the Figma `size-[20px]` core.
 */
export function ConnectLogo(props: React.ComponentPropsWithoutRef<'svg'>) {
  const reactId = useId();
  const baseId = `${reactId}-connect-base`;
  const highlightId = `${reactId}-connect-highlight`;
  const shineId = `${reactId}-connect-shine`;
  const shadeId = `${reactId}-connect-shade`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" {...props}>
      <defs>
        {/*
         * Brand gradient sampled from Figma node 7302:35213:
         *   linear-gradient(25.85deg, rgb(217, 115, 87) 26.8%, rgb(194, 92, 214) 50%, rgb(140, 107, 239) 80.5%)
         */}
        <linearGradient id={baseId} x1="3" y1="3" x2="17" y2="17" gradientUnits="userSpaceOnUse">
          <stop offset="0.27" stopColor="#D97357" />
          <stop offset="0.5" stopColor="#C25CD6" />
          <stop offset="0.8" stopColor="#8C6BEF" />
        </linearGradient>
        <radialGradient
          id={highlightId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(7 6) rotate(50) scale(7 7)"
        >
          <stop offset="0" stopColor="#FFE7CF" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#FF9BD2" stopOpacity="0.35" />
          <stop offset="1" stopColor="#8C6BEF" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={shineId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(6 4.5) rotate(60) scale(4 4)"
        >
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={shadeId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(14 16) rotate(-110) scale(8 8)"
        >
          <stop offset="0" stopColor="#5B2D9E" stopOpacity="0.45" />
          <stop offset="1" stopColor="#5B2D9E" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="10" cy="10" r="10" fill={`url(#${baseId})`} />
      <circle cx="10" cy="10" r="10" fill={`url(#${shadeId})`} />
      <circle cx="10" cy="10" r="10" fill={`url(#${highlightId})`} />
      <circle cx="10" cy="10" r="10" fill={`url(#${shineId})`} />
    </svg>
  );
}
