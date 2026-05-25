import { ConnectLogomark, type ConnectLogomarkProps } from '@/components/icons/connect-logomark';

export type ConnectLogoProps = ConnectLogomarkProps;

export function ConnectLogo(props: ConnectLogoProps) {
  return <ConnectLogomark {...props} />;
}
