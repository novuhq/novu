import { useAuth, useClerk, useOrganization, useOrganizationList } from '@clerk/clerk-react';
import type { OrganizationMembershipResource } from '@clerk/types';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useCallback, useRef, useState } from 'react';
import { RiAddCircleLine, RiArrowDownSLine, RiArrowRightSLine, RiLoader4Line } from 'react-icons/ri';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/primitives/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { useRegion } from '@/context/region';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';

const SCROLL_THRESHOLD = 50;
const PAGE_SIZE = 8;

function getOrganizationInitials(name: string) {
  return name
    .split(' ')
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
        <span className="absolute inset-0 -translate-x-full rotate-12 bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-[shimmer_0.8s_ease-in-out] pointer-events-none" />
      )}
    </span>
  );
}

type OrganizationListItemProps = {
  membership: OrganizationMembershipResource;
  onSwitch: (id: string) => void;
  disabled: boolean;
};

function OrganizationListItem({ membership, onSwitch, disabled }: OrganizationListItemProps) {
  return (
    <DropdownMenuItem
      className="group flex cursor-pointer items-center gap-2 rounded-sm border-0 px-2 py-1.5 text-sm focus:bg-accent"
      onClick={() => onSwitch(membership.organization.id)}
      disabled={disabled}
    >
      <OrganizationAvatar imageUrl={membership.organization.imageUrl} name={membership.organization.name} />
      <span className="flex-1 text-foreground-950">{membership.organization.name}</span>
      <RiArrowRightSLine className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
    </DropdownMenuItem>
  );
}

export const OrganizationDropdown = () => {
  const { organization: currentOrganization } = useOrganization();
  const { orgId } = useAuth();
  const clerk = useClerk();
  const { selectedRegion } = useRegion();
  const isRegionSelectorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_REGION_SELECTOR_ENABLED, false);
  const { userMemberships, isLoaded } = useOrganizationList({
    userMemberships: { infinite: true, pageSize: PAGE_SIZE },
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleOrganizationSwitch = async (organizationId: string) => {
    if (organizationId === orgId || isSwitching) return;

    setIsSwitching(true);
    try {
      await clerk.setActive({ organization: organizationId });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch organization:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !userMemberships?.hasNextPage || userMemberships?.isFetching) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD) {
      userMemberships.fetchNext?.();
    }
  }, [userMemberships]);

  const filterMemberships = useCallback(
    (membership: OrganizationMembershipResource) => {
      if (membership.organization.id === orgId) return false;

      if (isRegionSelectorEnabled) {
        const orgRegion = membership.organization.publicMetadata?.region as string | undefined;

        return !orgRegion || orgRegion === selectedRegion;
      }

      return true;
    },
    [orgId, isRegionSelectorEnabled, selectedRegion]
  );

  if (!isLoaded || !currentOrganization) {
    return (
      <div className="w-full px-1.5 py-1.5">
        <div className="h-10 w-full animate-pulse rounded-lg bg-neutral-alpha-100" />
      </div>
    );
  }

  const filteredMemberships = userMemberships?.data?.filter(filterMemberships) || [];

  return (
    <>
      <style>
        {`
          @keyframes shimmer {
            from { transform: translateX(-100%); }
            to { transform: translateX(100%); }
          }
        `}
      </style>

      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'group relative flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 transition-all duration-300',
              'hover:bg-background hover:shadow-sm',
              'before:absolute before:bottom-0 before:left-0 before:h-0 before:w-full before:border-b before:border-neutral-alpha-100 before:transition-all before:duration-300 before:content-[""]',
              'hover:before:border-transparent',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-background focus-visible:shadow-sm focus-visible:before:border-transparent'
            )}
          >
            <OrganizationAvatar imageUrl={currentOrganization.imageUrl} name={currentOrganization.name} showShimmer />
            <span className="text-sm font-medium text-foreground-950">{currentOrganization.name}</span>
            <RiArrowDownSLine className="ml-auto size-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus:opacity-100" />
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
            {filteredMemberships.map((membership) => (
              <OrganizationListItem
                key={membership.id}
                membership={membership}
                onSwitch={handleOrganizationSwitch}
                disabled={isSwitching}
              />
            ))}

            {userMemberships?.isFetching && (
              <div className="flex items-center justify-center py-2">
                <RiLoader4Line className="size-4 animate-spin text-foreground-600" />
              </div>
            )}
          </div>

          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2 rounded-none border-t border-neutral-alpha-200 px-3 py-1.5 text-sm focus:bg-accent hover:bg-accent"
            onSelect={() => {
              window.location.href = ROUTES.SIGNUP_ORGANIZATION_LIST;
            }}
          >
            <RiAddCircleLine className="size-4" />
            <span className="text-foreground-950">Create organization</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
