import { useId } from 'react';

/** Figma logomark frame size (`7300:35178` / `7300:35179` core). */
const SIZE = 31.223;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 0.3;

/**
 * Novu Connect logomark — Figma node `7300:35178`.
 *
 * Vector recreation of the iridescent sphere: base gradient from the Figma core
 * (`7300:35179`), colour-wash radials (`7300:35194`), specular highlight, and a
 * grain overlay (`7300:35201`). The source uses ~8 blended bitmap layers; this SVG
 * captures the same orange → magenta → indigo palette, soft edge blur (0.874 px),
 * and film-grain texture without a raster fallback.
 */
export function ConnectLogo(props: React.ComponentPropsWithoutRef<'svg'>) {
  const reactId = useId().replace(/:/g, '');
  const clipId = `${reactId}-clip`;
  const blurId = `${reactId}-blur`;
  const grainId = `${reactId}-grain`;
  const baseId = `${reactId}-base`;
  const warmId = `${reactId}-warm`;
  const bloomId = `${reactId}-bloom`;
  const depthId = `${reactId}-depth`;
  const specId = `${reactId}-spec`;
  const rimId = `${reactId}-rim`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox={`0 0 ${SIZE} ${SIZE}`} {...props}>
      <defs>
        <clipPath id={clipId}>
          <circle cx={CENTER} cy={CENTER} r={RADIUS} />
        </clipPath>

        {/* Figma core blur: `blur-[0.874px]` on `7300:35179`. */}
        <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="0.874" />
        </filter>

        {/* Figma core gradient: linear-gradient(25.85deg, #D97357 26.8%, #C25CD6 50%, #8C6BEF 80.5%). */}
        <linearGradient
          id={baseId}
          x1="3.5"
          y1="27.5"
          x2="27.5"
          y2="3.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#E07F62" />
          <stop offset="0.268" stopColor="#D97357" />
          <stop offset="0.5" stopColor="#C25CD6" />
          <stop offset="0.805" stopColor="#8C6BEF" />
          <stop offset="1" stopColor="#7A62E8" />
        </linearGradient>

        {/* Warm peach bloom — bottom-left, mimics Figma screen/plus-lighter washes. */}
        <radialGradient
          id={warmId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(8.5 23) rotate(-12) scale(13 11)"
        >
          <stop offset="0" stopColor="#FFF4E6" stopOpacity="0.95" />
          <stop offset="0.25" stopColor="#FFB88A" stopOpacity="0.75" />
          <stop offset="0.55" stopColor="#F06BB0" stopOpacity="0.35" />
          <stop offset="1" stopColor="#8C6BEF" stopOpacity="0" />
        </radialGradient>

        {/* Magenta mid-tone bloom — centre-left colour wash. */}
        <radialGradient
          id={bloomId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(13 14) rotate(18) scale(11 10)"
        >
          <stop offset="0" stopColor="#FF5EC4" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#D050D8" stopOpacity="0.35" />
          <stop offset="1" stopColor="#8C6BEF" stopOpacity="0" />
        </radialGradient>

        {/* Indigo depth — top-right shadow (`mix-blend-soft-light` in Figma). */}
        <radialGradient
          id={depthId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(24 7) rotate(145) scale(14 12)"
        >
          <stop offset="0" stopColor="#3D2A9E" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#5A45C8" stopOpacity="0.25" />
          <stop offset="1" stopColor="#8C6BEF" stopOpacity="0" />
        </radialGradient>

        {/* Specular highlight — upper-left glass shine. */}
        <radialGradient
          id={specId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(10.5 8.5) rotate(-25) scale(5.5 3.5)"
        >
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="0.45" stopColor="#FFE8F5" stopOpacity="0.25" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>

        {/* Subtle rim light — keeps the sphere edge from going flat. */}
        <radialGradient
          id={rimId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform={`translate(${CENTER} ${CENTER}) scale(${RADIUS})`}
        >
          <stop offset="0.82" stopColor="#8C6BEF" stopOpacity="0" />
          <stop offset="0.94" stopColor="#FFFFFF" stopOpacity="0.12" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>

        {/* Figma noise layer `7300:35201`: opacity 40%, mix-blend overlay. */}
        <filter id={grainId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="4" seed="8" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.38 0"
            result="noiseAlpha"
          />
          <feBlend in="SourceGraphic" in2="noiseAlpha" mode="overlay" />
        </filter>
      </defs>

      <g clipPath={`url(#${clipId})`} filter={`url(#${blurId})`}>
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 0.5} fill={`url(#${baseId})`} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 0.5} fill={`url(#${warmId})`} style={{ mixBlendMode: 'screen' }} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 0.5} fill={`url(#${bloomId})`} style={{ mixBlendMode: 'overlay' }} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 0.5} fill={`url(#${depthId})`} style={{ mixBlendMode: 'soft-light' }} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 0.5} fill={`url(#${specId})`} style={{ mixBlendMode: 'plus-lighter' }} />
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 0.5} fill={`url(#${rimId})`} />
      </g>

      <g clipPath={`url(#${clipId})`} opacity="0.4" filter={`url(#${grainId})`}>
        <rect width={SIZE} height={SIZE} fill={`url(#${baseId})`} />
      </g>
    </svg>
  );
}
