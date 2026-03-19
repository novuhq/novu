import { useAuth, useClerk, useOrganization, useOrganizationList } from '@clerk/clerk-react';
import { FeatureFlagsKeysEnum } from '@novu/shared';

type OrganizationMembershipLike = {
  id: string;
  organization: {
    id: string;
    name: string;
    imageUrl: string;
    publicMetadata: Record<string, unknown>;
  };
};

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RiAddCircleLine, RiArrowDownSLine, RiArrowRightSLine, RiLoader4Line } from 'react-icons/ri';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/primitives/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { DEFAULT_REGION, getRegionCodeFromAws, useRegion } from '@/context/region';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';

const SCROLL_THRESHOLD = 100;
const PAGE_SIZE = 10;

function getOrganizationInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

type OrganizationAvatarProps = {
  imageUrl: string;
  name: string;
  size?: 'sm' | 'md';
  showShimmer?: boolean;
};

function OrganizationAvatar({ imageUrl, name, size = 'sm', showShimmer = false }: OrganizationAvatarProps) {
  const sizeClass = size === 'sm' ? 'size-6' : 'size-8';
  const textSizeClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={cn('relative rounded-full', showShimmer && 'overflow-hidden', sizeClass)}>
      <Avatar className={cn('rounded-full', sizeClass)}>
        <AvatarImage src={imageUrl} alt={name} />
        <AvatarFallback className={cn('bg-primary-base text-static-white', textSizeClass)}>
          {getOrganizationInitials(name)}
        </AvatarFallback>
      </Avatar>
      {showShimmer && (
        <span className="absolute inset-0 -translate-x-full rotate-12 bg-linear-to-r from-transparent via-white/30 to-transparent group-hover:animate-[shimmer_0.8s_ease-in-out] pointer-events-none" />
      )}
    </span>
  );
}

type OrganizationListItemProps = {
  membership: OrganizationMembershipLike;
  onSwitch: (id: string) => void;
  isSwitching: boolean;
  switchingToId: string | null;
};

function OrganizationListItem({ membership, onSwitch, isSwitching, switchingToId }: OrganizationListItemProps) {
  const isCurrentlySwitching = isSwitching && switchingToId === membership.organization.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
    >
      <DropdownMenuItem
        className="group flex h-9 cursor-pointer items-center justify-start gap-2 rounded-sm border-0 px-2 text-sm focus:bg-accent"
        onClick={() => onSwitch(membership.organization.id)}
        disabled={isSwitching}
      >
        <OrganizationAvatar imageUrl={membership.organization.imageUrl} name={membership.organization.name} />

        <span className="min-w-0 flex-1 truncate text-left text-foreground-950">{membership.organization.name}</span>

        {isCurrentlySwitching ? (
          <RiLoader4Line className="size-4 shrink-0 animate-spin text-foreground-600" />
        ) : (
          <RiArrowRightSLine className="size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </DropdownMenuItem>
    </motion.div>
  );
}

export function OrganizationDropdown() {
  const { organization: currentOrganization } = useOrganization();
  const { orgId } = useAuth();
  const clerk = useClerk();
  const { selectedRegion } = useRegion();
  const isRegionSelectorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_REGION_SELECTOR_ENABLED, false);

  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingToId, setSwitchingToId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { userMemberships, isLoaded } = useOrganizationList({
    userMemberships: {
      infinite: true,
      pageSize: PAGE_SIZE,
    },
  });

  useEffect(() => {
    if (isOpen) {
      userMemberships?.revalidate?.();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isRegionSelectorEnabled && userMemberships?.hasNextPage && !userMemberships?.isFetching) {
      userMemberships.fetchNext?.();
    }
  }, [isOpen, isRegionSelectorEnabled, userMemberships?.hasNextPage, userMemberships?.isFetching, userMemberships]);

  const handleOrganizationSwitch = async (organizationId: string) => {
    if (organizationId === orgId || isSwitching) return;

    setIsSwitching(true);
    setSwitchingToId(organizationId);
    try {
      await clerk.setActive({ organization: organizationId });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch organization:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      showErrorToast(`Unable to switch organizations. ${errorMessage}`, 'Organization Switch Failed');
    } finally {
      setIsSwitching(false);
      setSwitchingToId(null);
    }
  };

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setIsScrolled(container.scrollTop > 0);

    if (!userMemberships?.hasNextPage || userMemberships?.isFetching) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD) {
      userMemberships.fetchNext?.();
    }
  }, [userMemberships]);

  const filterMemberships = useCallback(
    (membership: OrganizationMembershipLike) => {
      if (membership.organization.id === orgId) return false;

      if (isRegionSelectorEnabled) {
        const orgAwsRegion = membership.organization.publicMetadata?.region as string | undefined;

        const orgRegionCode = orgAwsRegion ? getRegionCodeFromAws(orgAwsRegion) : DEFAULT_REGION;

        return orgRegionCode === selectedRegion;
      }

      return true;
    },
    [orgId, isRegionSelectorEnabled, selectedRegion]
  );

  if (!isLoaded || !currentOrganization) {
    return (
      <div className="w-full px-1.5 py-1.5">
        <div className="flex items-center gap-2 rounded-lg bg-neutral-alpha-50 px-2 py-1.5">
          <div className="size-6 animate-pulse rounded-full bg-neutral-alpha-100" />
          <div className="h-4 w-32 animate-pulse rounded bg-neutral-alpha-100" />
        </div>
      </div>
    );
  }

  const filteredMemberships = userMemberships?.data?.filter(filterMemberships) || [];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'group relative flex w-full items-center justify-start gap-2 rounded-lg px-1.5 py-1.5 transition-all duration-300',
            'hover:bg-background hover:shadow-sm',
            'before:absolute before:bottom-0 before:left-0 before:h-0 before:w-full before:border-b before:border-b-neutral-200 before:transition-all before:duration-300 before:content-[""]',
            'hover:before:border-transparent',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-background focus-visible:shadow-sm focus-visible:before:border-transparent'
          )}
        >
          <OrganizationAvatar imageUrl={currentOrganization.imageUrl} name={currentOrganization.name} showShimmer />
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground-950">
            {currentOrganization.name}
          </span>
          <RiArrowDownSLine className="ml-auto size-4 shrink-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus:opacity-100" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64 p-0" align="start">
        <div
          ref={scrollContainerRef}
          className="max-h-[200px] overflow-y-auto"
          role="group"
          aria-label="List of all organization memberships"
          onScroll={handleScroll}
        >
          <AnimatePresence mode="popLayout">
            {filteredMemberships.map((membership) => (
              <OrganizationListItem
                key={membership.id}
                membership={membership}
                onSwitch={handleOrganizationSwitch}
                isSwitching={isSwitching}
                switchingToId={switchingToId}
              />
            ))}
          </AnimatePresence>

          {userMemberships?.isFetching && (
            <div className="flex items-center justify-center py-2">
              <RiLoader4Line className="size-4 animate-spin text-foreground-600" />
            </div>
          )}
        </div>

        <DropdownMenuItem
          className={cn(
            'flex h-9 cursor-pointer items-center gap-2 rounded-none border-t border-neutral-200 px-2 text-sm transition-shadow focus:bg-accent hover:bg-accent',
            isScrolled && 'shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]'
          )}
          onSelect={() => {
            window.location.href = ROUTES.SIGNUP_ORGANIZATION_LIST;
          }}
        >
          <RiAddCircleLine className="size-4 text-text-sub" />
          <span className="text-text-sub">Create organization</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
