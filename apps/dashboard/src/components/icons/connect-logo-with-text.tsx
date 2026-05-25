import {
  CONNECT_LOCKUP_DISPLAY_HEIGHT,
  type ConnectLogoSurface,
  type ConnectLogoTreatment,
  connectLockupDisplayWidth,
  resolveConnectLogoWithTextAsset,
} from '@/components/icons/connect-brand-assets';
import { cn } from '@/utils/ui';

export type ConnectLogoWithTextProps = Omit<React.ComponentPropsWithoutRef<'img'>, 'src' | 'alt' | 'width' | 'height'> & {
  surface?: ConnectLogoSurface;
  treatment?: ConnectLogoTreatment;
  displayHeight?: number;
};

export function ConnectLogoWithText({
  surface = 'light',
  treatment = 'color',
  displayHeight = CONNECT_LOCKUP_DISPLAY_HEIGHT,
  className,
  style,
  ...props
}: ConnectLogoWithTextProps) {
  const asset = resolveConnectLogoWithTextAsset(surface, treatment);
  const displayWidth = connectLockupDisplayWidth(displayHeight);

  return (
    <img
      src={asset.src}
      alt="novu connect"
      width={displayWidth}
      height={displayHeight}
      decoding="async"
      className={cn('h-auto w-auto max-w-none object-contain object-left', className)}
      style={{ height: displayHeight, width: displayWidth, ...style }}
      {...props}
    />
  );
}
