import { Avatar } from '@/components/primitives/avatar';
import { Button } from '@/components/primitives/button';
import { NovuLogoBlackBg } from './icons';
import { useOrganization } from './index';

function OrganizationSwitcherComponent() {
  const { organization } = useOrganization() as { organization: { name: string } | undefined };

  if (!organization) return null;

  return (
    <div className="w-full [&:focus-visible]:shadow-none [&:focus]:shadow-none">
      <Button
        variant="secondary"
        size="sm"
        className="group h-9 w-full justify-between bg-white p-1.5 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-0 focus-visible:shadow-none"
      >
        <div className="flex items-center gap-2">
          <OrganizationAvatar shining={true} />
          <span className="truncate text-sm font-medium text-gray-700">{organization.name}</span>
        </div>
      </Button>
    </div>
  );
}

export { OrganizationSwitcherComponent as OrganizationSwitcher, OrganizationSwitcherComponent as OrganizationDropdown };

const OrganizationAvatar = ({ shining = false }: { shining?: boolean }) => {
  return (
    <Avatar className="relative h-6 w-6 overflow-hidden border-gray-200">
      <NovuLogoBlackBg />
      {shining && (
        <div className="absolute inset-0 before:absolute before:left-[-100%] before:top-0 before:h-full before:w-full before:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.3),transparent)] before:transition-all before:duration-[10000ms] before:ease-in-out group-hover:before:left-[100%]"></div>
      )}
    </Avatar>
  );
};
