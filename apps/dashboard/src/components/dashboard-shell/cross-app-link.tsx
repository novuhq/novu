import { useAuth, useClerk } from '@clerk/react';
import { type MouseEvent, type ReactNode } from 'react';
import { IS_HOSTNAME_SPLIT_ENABLED } from '@/config';
import { isAbsoluteUrl, isSafeNavigationHref } from '@/utils/apps';
import { navigateWithClerkSessionIfCrossOrigin } from '@/utils/connect/clerk-cross-origin-auth';
import { isConnectHostnameUrl } from '@/utils/product-auth-urls';

type CrossAppLinkProps = {
  href: string;
  openInNewTab?: boolean;
  className?: string;
  'aria-label'?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
};

export function CrossAppLink({ href, openInNewTab, className, onClick, children, ...rest }: CrossAppLinkProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const clerk = useClerk();
  const isHrefSafe = isSafeNavigationHref(href);
  const isCrossOrigin = isHrefSafe && IS_HOSTNAME_SPLIT_ENABLED && isAbsoluteUrl(href);
  const safeAnchorHref = isHrefSafe ? href : '#';

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (!isHrefSafe) {
      event.preventDefault();

      return;
    }

    if (!isCrossOrigin) {
      return;
    }

    event.preventDefault();

    if (openInNewTab) {
      window.open(href, '_blank', 'noopener,noreferrer');

      return;
    }

    const shouldSyncClerkSession = isConnectHostnameUrl(href) && isLoaded && isSignedIn && clerk.loaded;

    if (shouldSyncClerkSession) {
      void navigateWithClerkSessionIfCrossOrigin(clerk, href);

      return;
    }

    window.location.assign(href);
  };

  return (
    <a
      href={safeAnchorHref}
      onClick={isCrossOrigin || onClick || !isHrefSafe ? handleClick : undefined}
      target={isCrossOrigin ? undefined : openInNewTab ? '_blank' : undefined}
      rel={isCrossOrigin ? undefined : openInNewTab ? 'noopener noreferrer' : undefined}
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}
