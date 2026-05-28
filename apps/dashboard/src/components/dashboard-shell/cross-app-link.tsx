import { type MouseEvent, type ReactNode } from 'react';
import { IS_HOSTNAME_SPLIT_ENABLED } from '@/config';
import { isAbsoluteUrl, isSafeNavigationHref } from '@/utils/apps';

type CrossAppLinkProps = {
  href: string;
  openInNewTab?: boolean;
  className?: string;
  'aria-label'?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
};

// Hands off to the browser for cross-origin hrefs; Clerk's satellite domain SDK picks up the
// session sync via its built-in handshake when the satellite page loads. Avoid `clerk.redirectWithAuth`
// here — it short-circuits the satellite SDK's handshake and produced a `__clerk_synced=false`
// redirect loop between Platform and Connect.
export function CrossAppLink({ href, openInNewTab, className, onClick, children, ...rest }: CrossAppLinkProps) {
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
