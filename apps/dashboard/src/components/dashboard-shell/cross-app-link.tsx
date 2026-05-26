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

// Hands off to the browser for cross-origin hrefs; Clerk satellite sync picks up the session.
export function CrossAppLink({ href, openInNewTab, className, onClick, children, ...rest }: CrossAppLinkProps) {
  const isHrefSafe = isSafeNavigationHref(href);
  const isCrossOrigin = isHrefSafe && IS_HOSTNAME_SPLIT_ENABLED && isAbsoluteUrl(href);
  // Anchor href degrades to `#` for non-http(s) targets so a click can never execute `javascript:` etc.
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
