import { useAuth, useClerk, useOrganization, useOrganizationList } from '@clerk/clerk-react';
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
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';

export const OrganizationDropdown = () => {
  const { organization: currentOrganization } = useOrganization();
  const { orgId } = useAuth();
  const clerk = useClerk();
  const { selectedRegion } = useRegion();
  const { userMemberships, isLoaded } = useOrganizationList({
    userMemberships: {
      infinite: true,
      pageSize: 8,
    },
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
    const scrollThreshold = 50;

    if (scrollHeight - scrollTop - clientHeight < scrollThreshold) {
      userMemberships.fetchNext?.();
    }
  }, [userMemberships]);

  if (!isLoaded || !currentOrganization) {
    return (
      <div className="w-full px-1.5 py-1.5">
        <div className="bg-neutral-alpha-100 h-10 w-full animate-pulse rounded-lg" />
      </div>
    );
  }

  const getOrganizationInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'group relative flex w-full cursor-pointer items-center gap-2 rounded-lg px-1.5 py-0 transition duration-300 ease-out',
            'justify-start hover:bg-background',
            'before:border-neutral-alpha-100 before:absolute before:bottom-0 before:left-0 before:h-0 before:w-full before:border-b before:border-solid before:transition-all before:duration-300 before:ease-out before:content-[""]',
            'hover:shadow-sm hover:before:border-transparent',
            'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
            'focus:bg-transparent focus:bg-background focus:shadow-sm focus:before:border-transparent'
          )}
        >
          <span className="flex items-center gap-2 py-1.5">
            <span className="relative size-6 rounded-full overflow-hidden">
              <Avatar className="size-6 rounded-full">
                <AvatarImage src={currentOrganization.imageUrl} alt={currentOrganization.name} />
                <AvatarFallback className="bg-primary-base text-static-white text-[14px] text-foreground-950 text-base">
                  {getOrganizationInitials(currentOrganization.name)}
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  'absolute inset-0 -translate-x-full rotate-12',
                  'bg-gradient-to-r from-transparent via-white/30 to-transparent',
                  'group-hover:animate-[shimmer_0.8s_ease-in-out]',
                  'pointer-events-none'
                )}
              />
            </span>
            <span className="flex flex-col">
              <span className="text-[14px] font-medium text-foreground-950">{currentOrganization.name}</span>
            </span>
          </span>
          <RiArrowDownSLine
            className={cn(
              'ml-auto size-4 opacity-0 transition duration-300 ease-out',
              'group-hover:opacity-100 group-focus:opacity-100'
            )}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64 px-0 py-0" align="start">
        <div className="flex flex-col">
          <div
            ref={scrollContainerRef}
            className="max-h-[200px] overflow-y-auto py-0 [&_.organization-name]:text-sm"
            role="group"
            aria-label="List of all organization memberships"
            onScroll={handleScroll}
          >
            {userMemberships?.data
              ?.filter((membership) => {
                if (membership.organization.id === orgId) return false;

                const orgRegion = membership.organization.publicMetadata?.region as string | undefined;

                return !orgRegion || orgRegion === selectedRegion;
              })
              .map((membership) => (
                <DropdownMenuItem
                  key={membership.id}
                  className={cn(
                    'group flex cursor-pointer items-center gap-2 rounded-sm p-0 text-sm',
                    'focus:bg-accent',
                    '!border-0 px-2'
                  )}
                  onClick={() => handleOrganizationSwitch(membership.organization.id)}
                  disabled={isSwitching}
                >
                  <span className="flex flex-1 items-center gap-2 py-1.5">
                    <Avatar className="size-6 rounded-full">
                      <AvatarImage src={membership.organization.imageUrl} alt={membership.organization.name} />
                      <AvatarFallback className="bg-primary-base text-static-white text-xs">
                        {getOrganizationInitials(membership.organization.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-foreground-950 organization-name text-sm">
                      {membership.organization.name}
                    </span>
                  </span>
                  <RiArrowRightSLine className="size-4 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                </DropdownMenuItem>
              ))}

            {userMemberships?.isFetching && (
              <div className="flex items-center justify-center py-2">
                <RiLoader4Line className="size-4 animate-spin text-foreground-600" />
              </div>
            )}
          </div>

          <DropdownMenuItem
            className={cn(
              'flex cursor-pointer items-center gap-0 rounded-none py-1 text-sm border-t border-neutral-alpha-200',
              'px-3 py-1.5',
              'focus:bg-accent hover:bg-accent'
            )}
            onSelect={() => {
              window.location.href = ROUTES.SIGNUP_ORGANIZATION_LIST;
            }}
          >
            <span className="mr-2 flex size-4 items-center justify-center">
              <RiAddCircleLine className="size-4" />
            </span>
            <span className="text-foreground-950 text-sm">Create organization</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('shimmer-style')) {
  style.id = 'shimmer-style';
  document.head.appendChild(style);
}
