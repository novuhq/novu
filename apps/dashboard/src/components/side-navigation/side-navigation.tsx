import { useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { cva, VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/ui';
import { Badge } from '../primitives/badge';
import { EnvironmentDropdown } from './environment-dropdown';
import { useEnvironment } from '@/context/environment/hooks';
import { OrganizationDropdown } from './organization-dropdown';
import { buildNavigationItems, navigationItems } from './constants';
import { NavItemsGroup, NavItem } from './types';
import { FreeTrialCard } from './free-trial-card';

const linkVariants = cva(
  `flex items-center gap-2 text-sm py-1.5 px-3 rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring `,
  {
    variants: {
      variant: {
        default: 'text-foreground-600/95 transition ease-out duration-300 hover:bg-accent',
        selected: 'text-foreground-950 transition ease-out duration-300 hover:bg-accent',
        disabled: 'text-foreground-300 cursor-help',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type NavLinkProps = {
  to?: string;
  isExternal?: boolean;
  className?: string;
  children: React.ReactNode;
} & VariantProps<typeof linkVariants>;

const NavLink = ({ to, isExternal, className, variant, children }: NavLinkProps) => {
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
};

const NavigationItem = ({ item }: { item: NavItem }) => {
  const { label, to, icon: Icon, disabled, isExternal } = item;
  const { pathname } = useLocation();
  const isSelected = pathname === to;
  const variant = disabled ? 'disabled' : isSelected ? 'selected' : 'default';

  return (
    <NavLink to={to} isExternal={isExternal} variant={variant}>
      <Icon className="size-4" />
      <span>{label}</span>
      {disabled && (
        <Badge className="text-foreground-300 ml-auto" kind="pill">
          soon
        </Badge>
      )}
    </NavLink>
  );
};

const NavigationItemsGroup = ({ group }: { group: NavItemsGroup }) => {
  return (
    <div className="flex flex-col last:mt-auto">
      {!!group.label && <span className="text-foreground-400 px-2 py-1 text-xs uppercase">{group.label}</span>}
      {group.items.map((item, idx) => (
        <NavigationItem key={`${item.label}_${idx}`} item={item} />
      ))}
    </div>
  );
};

export const SideNavigation = () => {
  const { currentEnvironment, environments, switchEnvironment } = useEnvironment();
  const environmentNames = useMemo(() => environments?.map((env) => env.name), [environments]);
  const onEnvironmentChange = (value: string) => {
    const environment = environments?.find((env) => env.name === value);
    switchEnvironment(environment?._id);
  };

  const navigationItems = useMemo(() => buildNavigationItems({ currentEnvironment }), [currentEnvironment]);

  return (
    <aside className="bg-secondary-alpha-50 relative flex w-[275px] flex-shrink-0 flex-col gap-3 px-2 pb-3 pt-1.5">
      <FreeTrialCard />
      <OrganizationDropdown />
      <EnvironmentDropdown value={currentEnvironment?.name} data={environmentNames} onChange={onEnvironmentChange} />
      <nav className="flex flex-1 flex-col gap-4">
        {navigationItems.map((group, idx) => (
          <NavigationItemsGroup key={`${group.label}_${idx}`} group={group} />
        ))}
      </nav>
    </aside>
  );
};
