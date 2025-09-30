import { EnvironmentTypeEnum, FeatureFlagsKeysEnum, PermissionsEnum } from '@novu/shared';
import { HTMLAttributes, ReactNode } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import { useCommandPalette } from '@/components/command-palette/hooks/use-command-palette';
import { InboxButton } from '@/components/inbox-button';
import { UserProfile } from '@/components/user-profile';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
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
};

export const HeaderNavigation = (props: HeaderNavigationProps) => {
  const { startItems, hideBridgeUrl = false, className, ...rest } = props;
  const { currentEnvironment } = useEnvironment();
  const has = useHasPermission();
  const canPublish = has({ permission: PermissionsEnum.ENVIRONMENT_WRITE });
  const { openCommandPalette } = useCommandPalette();

  const isNewChangeMechanismEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_NEW_CHANGE_MECHANISM_ENABLED, false);

  return (
    <div
      className={cn(
        'bg-background flex h-12 w-full items-center justify-between border-b border-b-neutral-200 px-2.5 py-1.5',
        className
      )}
      {...rest}
    >
      {startItems}
      <div className="text-foreground-600 ml-auto flex items-center gap-2">
        <Button
          variant="secondary"
          mode="outline"
          className="h-[26px] px-[5px]"
          size="2xs"
          onClick={openCommandPalette}
        >
          <RiSearchLine className="size-3 text-text-sub" />
          <Kbd className="bg-bg-weak rounded-4 h-[16px]">⌘K</Kbd>
        </Button>
        {isNewChangeMechanismEnabled && currentEnvironment?.type === EnvironmentTypeEnum.DEV && canPublish && (
          <PublishButton />
        )}
        {!hideBridgeUrl ? <EditBridgeUrlButton /> : null}
        {!(IS_SELF_HOSTED && IS_ENTERPRISE) && <CustomerSupportButton />}
        <div className="flex pr-0.5">
          <InboxButton />
        </div>
        <UserProfile />
      </div>
    </div>
  );
};
