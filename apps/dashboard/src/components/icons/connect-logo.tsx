import { ConnectLogomark, type ConnectLogomarkProps } from '@/components/icons/connect-logomark';

export type ConnectLogoProps = ConnectLogomarkProps;

/**
 * Novu Connect logomark for compact UI (app rail, loaders). Defaults to the color
 * variant for light dashboard surfaces.
 */
export function ConnectLogo(props: ConnectLogoProps) {
  return <ConnectLogomark {...props} />;
}
