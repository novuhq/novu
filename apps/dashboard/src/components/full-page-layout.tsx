import { FeatureFlagsKeysEnum } from '@novu/shared';
import { ReactNode } from 'react';
import { HeaderNavigation } from '@/components/header-navigation/header-navigation';
import { MobileDesktopPrompt } from '@/components/mobile-desktop-prompt';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

export const FullPageLayout = ({
  children,
  headerStartItems,
}: {
  children: ReactNode;
  headerStartItems?: ReactNode;
}) => {
  const isShellV2 = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONNECT_DASHBOARD_ENABLED, false);

  if (isShellV2) {
    return (
      <div className="relative flex h-full w-full bg-bg-muted p-2">
        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden bg-bg-white rounded-md">
          <HeaderNavigation startItems={headerStartItems} hideBridgeUrl />

          <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">{children}</div>
        </div>
        <MobileDesktopPrompt />
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full">
      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <HeaderNavigation startItems={headerStartItems} hideBridgeUrl />

        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">{children}</div>
      </div>
      <MobileDesktopPrompt />
    </div>
  );
};
