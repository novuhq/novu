import { Avatar } from '@/components/primitives/avatar';
import { NovuLogoBlackBg } from './icons';
import { useOrganization } from './index';

function OrganizationSwitcherComponent() {
  const { organization, isLoaded } = useOrganization() as {
    organization: { name: string } | undefined;
    isLoaded: boolean;
  };

  if (!isLoaded) {
    return (
      <div className="flex w-full items-center gap-2 px-1.5 py-1.5">
        <div className="size-6 animate-pulse rounded-full bg-neutral-alpha-100" />
        <div className="h-4 w-32 animate-pulse rounded bg-neutral-alpha-100" />
      </div>
    );
  }

  if (!organization) return null;

  return (
    <div className="relative flex w-full items-center justify-start gap-2 rounded-lg px-1.5 py-1.5">
      <OrganizationAvatar shining={false} />
      <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground-950">
        {organization.name}
      </span>
    </div>
  );
}

export { OrganizationSwitcherComponent as OrganizationDropdown, OrganizationSwitcherComponent as OrganizationSwitcher };

const OrganizationAvatar = ({ shining = false }: { shining?: boolean }) => {
  return (
    <Avatar className="relative h-6 w-6 overflow-hidden border-gray-200">
      <NovuLogoBlackBg />
      {shining && (
        <div className="absolute inset-0 before:absolute before:-left-full before:top-0 before:h-full before:w-full before:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.3),transparent)] before:transition-all before:duration-[10000ms] before:ease-in-out group-hover:before:left-full"></div>
      )}
    </Avatar>
  );
};
