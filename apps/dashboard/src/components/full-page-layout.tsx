import { ReactNode } from 'react';
import { HeaderNavigation } from '@/components/header-navigation/header-navigation';

export const FullPageLayout = ({
  children,
  headerStartItems,
}: {
  children: ReactNode;
  headerStartItems?: ReactNode;
}) => {
  return (
    <div className="relative flex h-full w-full">
      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <HeaderNavigation startItems={headerStartItems} hideBridgeUrl />

        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
};
