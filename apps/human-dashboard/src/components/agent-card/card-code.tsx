import QRCode from 'react-qr-code';

import { QR_COLORS, qrModulesOf } from '@/lib/agent-card';
import { cn } from '@/lib/utils';

/** Each module's size. Under 2px, a phone can't tell them apart on a screen with one pixel to a CSS pixel. */
const MODULE_PX = 2;

type CardCodeProps = {
  value: string;
  label: string;
  className?: string;
};

/**
 * The code to scan on an agent's card, dark on a white tile. Not as drawn: the design has a 44px code, light on
 * the dark portrait, which phones found hard to read and some scanners can't read at all (NV-9210). Whole pixels
 * per module make the code 50, 58 or 66px across as `value` grows, and `p-1` leaves 2 modules of white around it.
 */
export function CardCode({ value, label, className }: CardCodeProps) {
  return (
    <div className={cn('rounded p-1', className)} style={{ backgroundColor: QR_COLORS.light }}>
      <QRCode
        value={value}
        size={qrModulesOf(value) * MODULE_PX}
        level="L"
        bgColor={QR_COLORS.light}
        fgColor={QR_COLORS.dark}
        shapeRendering="crispEdges"
        aria-label={label}
        className="block"
      />
    </div>
  );
}
