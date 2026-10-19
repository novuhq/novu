import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { cn } from '@/utils/ui';

type OnboardingShellProps = {
  left: ReactNode;
  /**
   * Optional preview panel rendered on the right (~40%). When omitted, the layout collapses to a
   * single full-width column and the content container is centered using `maxLeftWidth`.
   */
  right?: ReactNode;
  maxLeftWidth?: string;
  /** Tailwind classes for the inner content container (e.g. responsive max-width). Overrides `maxLeftWidth` when set. */
  contentClassName?: string;
  alignLeft?: 'center' | 'top';
};

const STRIPES_BACKGROUND =
  'repeating-linear-gradient(135deg, rgba(0,0,0,0.07) 0px, rgba(0,0,0,0.07) 7px, rgba(0,0,0,0.11) 7px, rgba(0,0,0,0.11) 14px)';

// Soft pastel glow recreated from Figma node 7733-63979 ("Background"): a warm cream glow on the
// upper-left and a pink glow upper-center, fading out to white in the lower half. Recreated with
// CSS radial gradients instead of the Figma ellipse image assets (which expire).
const GLOW_BACKGROUND = [
  'radial-gradient(60% 45% at 18% 0%, rgba(253,243,214,0.65) 0%, rgba(253,243,214,0) 70%)',
  'radial-gradient(55% 45% at 56% 4%, rgba(249,214,230,0.6) 0%, rgba(249,214,230,0) 70%)',
  'radial-gradient(60% 50% at 88% 12%, rgba(245,226,240,0.45) 0%, rgba(245,226,240,0) 70%)',
].join(', ');

export function OnboardingShell({
  left,
  right,
  maxLeftWidth = '480px',
  contentClassName,
  alignLeft = 'center',
}: OnboardingShellProps) {
  const isSingleColumn = right === undefined || right === null;

  return (
    <div className="relative flex h-screen w-full">
      {/* Single-column decorative backdrop — the striped pattern + gradient that previously lived
       * behind the right preview panel, now spanning the whole page. */}
      {isSingleColumn && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden bg-white">
          {/* Pastel glow gradient sits under the stripes (Figma node 7733-63979). */}
          <div className="absolute inset-0 opacity-60" style={{ background: GLOW_BACKGROUND }} />
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: STRIPES_BACKGROUND }} />
        </div>
      )}

      {/* Left — content (~60%, or full width in single-column mode) */}
      <div
        className={`relative z-10 flex w-full flex-col items-center overflow-y-auto [scrollbar-gutter:stable] ${
          isSingleColumn ? '' : 'bg-white md:w-[50%] xl:w-[60%]'
        } ${alignLeft === 'top' ? 'pt-16' : 'justify-center'}`}
      >
        <motion.div
          key="left"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={cn('w-full px-8', contentClassName)}
          style={contentClassName ? undefined : { maxWidth: maxLeftWidth }}
        >
          {left}
        </motion.div>
      </div>

      {/* Right — preview panel (~40%) */}
      {isSingleColumn ? null : (
        <div className="relative hidden overflow-hidden bg-white md:flex md:w-[50%] xl:w-[40%]">
          <div className="absolute inset-0 opacity-60" style={{ background: GLOW_BACKGROUND }} />
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: STRIPES_BACKGROUND }} />
          <div className="relative flex flex-1 flex-col items-center justify-center p-8">
            <motion.div
              key="right"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
            >
              {right}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
