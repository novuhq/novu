import { IS_HOSTNAME_SPLIT_ENABLED } from '@/config';
import { isAbsoluteUrl } from '@/utils/apps';
import { buildDestinationSignInUrl } from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { type MouseEvent, type ReactNode } from 'react';

type CrossAppLinkProps = {
  href: string;
  openInNewTab?: boolean;
  className?: string;
  'aria-label'?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
};

/**
 * Cross-origin product switcher. Signed-in users use Clerk redirectWithAuth / buildUrlWithAuth.
 * Signed-out users are sent to sign-in on the destination host.
 */
export function CrossAppLink({ href, openInNewTab, className, onClick, children, ...rest }: CrossAppLinkProps) {
  const clerk = useClerk();
  const { isSignedIn, isLoaded } = useAuth();

  const isCrossOrigin = IS_HOSTNAME_SPLIT_ENABLED && isAbsoluteUrl(href);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (!isCrossOrigin) {
      return;
    }

    event.preventDefault();

    if (!isLoaded || !clerk.loaded) {
      window.location.assign(href);

      return;
    }

    if (isSignedIn) {
      if (openInNewTab) {
        const authUrl = clerk.buildUrlWithAuth(href);
        window.open(authUrl, '_blank');

        return;
      }

      void clerk.redirectWithAuth(href);

      return;
    }

    window.location.assign(buildDestinationSignInUrl(href, ROUTES.SIGN_IN));
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
