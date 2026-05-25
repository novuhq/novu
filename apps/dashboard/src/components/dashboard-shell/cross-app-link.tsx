import { type MouseEvent, type ReactNode } from 'react';
import { IS_HOSTNAME_SPLIT_ENABLED } from '@/config';
import { isAbsoluteUrl } from '@/utils/apps';

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
  const isCrossOrigin = IS_HOSTNAME_SPLIT_ENABLED && isAbsoluteUrl(href);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (event.defaultPrevented || !isCrossOrigin) {
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
      href={href}
      onClick={isCrossOrigin || onClick ? handleClick : undefined}
      target={isCrossOrigin ? undefined : openInNewTab ? '_blank' : undefined}
      rel={isCrossOrigin ? undefined : openInNewTab ? 'noopener noreferrer' : undefined}
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}
