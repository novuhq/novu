import {
  type ConnectLogoSurface,
  type ConnectLogoTreatment,
  resolveConnectLogomarkAsset,
} from '@/components/icons/connect-brand-assets';
import { cn } from '@/utils/ui';

export type ConnectLogomarkProps = Omit<React.ComponentPropsWithoutRef<'img'>, 'src' | 'alt' | 'width' | 'height'> & {
  surface?: ConnectLogoSurface;
  treatment?: ConnectLogoTreatment;
};

/**
 * Novu Connect logomark (4× PNG from Figma). Use on light surfaces by default; pass
 * `surface="dark"` when the orb sits on a dark background.
 */
export function ConnectLogomark({
  surface = 'light',
  treatment = 'color',
  className,
  ...props
}: ConnectLogomarkProps) {
  const asset = resolveConnectLogomarkAsset(surface, treatment);

  return (
    <img
      src={asset.src}
      alt=""
      width={asset.intrinsicWidth}
      height={asset.intrinsicHeight}
      decoding="async"
      className={cn('object-contain', className)}
      {...props}
    />
  );
}
