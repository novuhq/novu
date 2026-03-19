import { EnvironmentTypeEnum, PermissionsEnum } from '@novu/shared';
import { HTMLAttributes, ReactNode } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import { useCommandPalette } from '@/components/command-palette/hooks/use-command-palette';
import { InboxButton } from '@/components/inbox-button';
import { MobileSideNavigation } from '@/components/side-navigation/mobile-side-navigation';
import { UserProfile } from '@/components/user-profile';
import { RegionSelector } from '@/context/region';
import { cn } from '@/utils/ui';
import { IS_ENTERPRISE, IS_SELF_HOSTED } from '../../config';
import { useEnvironment } from '../../context/environment/hooks';
import { useHasPermission } from '../../hooks/use-has-permission';
import { Button } from '../primitives/button';
import { Kbd } from '../primitives/kbd';
import { CustomerSupportButton } from './customer-support-button';
import { EditBridgeUrlButton } from './edit-bridge-url-button';
import { PublishButton } from './publish-button';

type HeaderNavigationProps = HTMLAttributes<HTMLDivElement> & {
  startItems?: ReactNode;
  hideBridgeUrl?: boolean;
  showMobileNav?: boolean;
};

export const HeaderNavigation = (props: HeaderNavigationProps) => {
  const { startItems, hideBridgeUrl = false, showMobileNav = false, className, ...rest } = props;
  const { currentEnvironment } = useEnvironment();
  const has = useHasPermission();
  const canPublish = has({ permission: PermissionsEnum.ENVIRONMENT_WRITE });
  const { openCommandPalette } = useCommandPalette();

  return (
    <div
      className={cn(
        'bg-background flex h-12 w-full items-center justify-between border-b border-b-neutral-200 px-2.5 py-1.5',
        className
      )}
      {...rest}
    >
      <div className="flex items-center gap-1">
        {showMobileNav && <MobileSideNavigation />}
        {startItems}
      </div>
      <div className="text-foreground-600 ml-auto flex items-center gap-2">
        <Button
          variant="secondary"
          mode="outline"
          className="hidden h-[26px] px-[5px] md:inline-flex"
          size="2xs"
          onClick={openCommandPalette}
        >
          <RiSearchLine className="size-3 text-text-sub" />
          <Kbd className="bg-bg-weak rounded-4 h-[16px]">⌘K</Kbd>
        </Button>
        <Button
          variant="secondary"
          mode="outline"
          className="h-[26px] px-[5px] md:hidden"
          size="2xs"
          onClick={openCommandPalette}
        >
          <RiSearchLine className="size-3 text-text-sub" />
        </Button>
        <span className="hidden md:contents">
          {currentEnvironment?.type === EnvironmentTypeEnum.DEV && canPublish && <PublishButton />}
          {!hideBridgeUrl ? <EditBridgeUrlButton /> : null}
          {!(IS_SELF_HOSTED && IS_ENTERPRISE) && <CustomerSupportButton />}
        </span>
        <div className="flex items-center gap-2">
          <InboxButton />
          <div className="hidden h-4 w-px bg-neutral-200 md:block" />
          <span className="hidden md:inline-flex">
            <RegionSelector />
          </span>
        </div>
        <UserProfile />
      </div>
    </div>
  );
};
