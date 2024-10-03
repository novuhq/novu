import { useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { cva, VariantProps } from 'class-variance-authority';
import { Show } from '../show';
import { cn } from '@/utils/ui';
import { Badge } from '../primitives/badge';
import { EnvironmentDropdown } from './environment-dropdown';
import { useEnvironment } from '@/context/environment/hooks';
import { OrganizationDropdown } from './organization-dropdown';
import { navitationItems } from './constants';
import { NavItemsGroup, NavItem } from './types';

const linkVariants = cva(
  `flex items-center gap-2 text-sm py-1.5 px-3 rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring `,
  {
    variants: {
      variant: {
        default: 'text-foreground/60 transition ease-out duration-300 hover:bg-accent',
        selected: 'text-foreground/95 transition ease-out duration-300 hover:bg-accent',
        disabled: 'text-foreground/30 cursor-not-allowed',
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
      <a href={to} className={classNames} target="_self" rel="noreferrer noopener">
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

  return (
    <Show
      when={!disabled}
      fallback={
        <NavLink variant="disabled">
          <Icon className="size-4" />
          <span>{label}</span>
          <Badge className="text-primary/30 ml-auto" kind="pill">
            soon
          </Badge>
        </NavLink>
      }
    >
      <NavLink to={to} isExternal={isExternal} variant={isSelected ? 'selected' : 'default'}>
        <Icon className="size-4" />
        <span>{label}</span>
      </NavLink>
    </Show>
  );
};

const NavigationItemsGroup = ({ group }: { group: NavItemsGroup }) => {
  return (
    <div className="flex flex-col last:mt-auto">
      <Show when={!!group.label}>
        <span className="text-foreground/40 px-2 py-1 text-xs uppercase">{group.label}</span>
      </Show>
      {group.items.map((item, idx) => (
        <NavigationItem key={`${item.label}_${idx}`} item={item} />
      ))}
    </div>
  );
};

export const SideNavigation = () => {
  const { currentEnvironment, environments, switchEnvironment } = useEnvironment();
  const environmentNames = useMemo(() => environments?.map((env) => env.name), [environments]);
  const onEnvironmentChange = (value: string) => switchEnvironment(value);

  return (
    <aside className="bg-card flex w-[275px] flex-shrink-0 flex-col gap-3 px-2 pb-3 pt-1.5">
      <OrganizationDropdown />
      <EnvironmentDropdown value={currentEnvironment?.name} data={environmentNames} onChange={onEnvironmentChange} />
      <nav className="flex flex-1 flex-col gap-4">
        {navitationItems.map((group, idx) => (
          <NavigationItemsGroup key={`${group.label}_${idx}`} group={group} />
        ))}
      </nav>
    </aside>
  );
};
