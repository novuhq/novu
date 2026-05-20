import { ConnectLogo } from '@/components/icons/connect-logo';

/**
 * "novu connect" brand mark used on the Connect-hostname auth pages — Figma node `7300:35176`.
 *
 * Exact measurements taken from the Figma logo frame (108.21 × 31.22 px):
 *  - Logomark sphere: 31.22 px square at (0, 0)
 *  - Wordmark text: at x = 38.21 → 31.22 sphere + ~7 px gap
 *  - Font: 18.175 px, two stacked lines at line-height 0.75 (≈ 13.6 px per line), tracking -0.36 px
 *
 * Co Text (the Figma font) is not bundled with the dashboard. Inter Regular at the same size and
 * leading is visually indistinguishable.
 */
export function ConnectBrandLogo() {
  return (
    <div className="inline-flex items-center gap-[7px]">
      <ConnectLogo className="size-[31px] shrink-0" />
      <div className="font-normal text-[18px] leading-[0.75] tracking-[-0.36px] text-neutral-900">
        <p className="leading-[0.75]">novu</p>
        <p className="leading-[0.75]">connect</p>
      </div>
    </div>
  );
}
