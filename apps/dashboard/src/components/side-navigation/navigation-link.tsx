import { Link as RouterLink, useLocation } from 'react-router-dom';
import { cva } from 'class-variance-authority';
import { cn } from '@/utils/ui';

const linkVariants = cva(
  `flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer`,
  {
    variants: {
      variant: {
        default: 'text-foreground-600/95 transition ease-out duration-300 hover:bg-accent',
        selected: 'text-foreground-950 bg-neutral-alpha-100 transition ease-out duration-300 hover:bg-accent',
        disabled: 'text-foreground-300 cursor-help',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface NavLinkProps {
  to?: string;
  isExternal?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function NavigationLink({ to, isExternal, className, children }: NavLinkProps) {
  const { pathname } = useLocation();
  const isSelected = pathname === to;
  const variant = isSelected ? 'selected' : 'default';
  const classNames = cn(linkVariants({ variant, className }));

  if (!to) {
    return <span className={classNames}>{children}</span>;
  }

  if (isExternal) {
    return (
      <a
        href={to}
        className={classNames}
        target={to.startsWith('https') ? '_blank' : '_self'}
        rel="noreferrer noopener"
      >
        {children}
      </a>
    );
  }

  return (
    <RouterLink to={to ?? '/'} className={classNames}>
      {children}
    </RouterLink>
  );
}
