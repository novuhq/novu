import { ConnectLogoWithText } from '@/components/icons/connect-logo-with-text';

/** "novu connect" lockup on Connect auth — `logo-with-text-light` (dark wordmark for light surfaces). */
export function ConnectBrandLogo() {
  return (
    <ConnectLogoWithText
      surface="light"
      treatment="color"
      className="shrink-0"
    />
  );
}
