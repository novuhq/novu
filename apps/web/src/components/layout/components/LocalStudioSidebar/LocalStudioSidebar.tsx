import { WithLoadingSkeleton } from '@novu/novui';
import { IconCloudQueue } from '@novu/novui/icons';
import { useDiscover } from '../../../../studio/hooks/useBridgeAPI';
import { Aside } from '../../../nav/Aside';
import { LocalStudioSidebarContent } from './LocalStudioSidebarContent';
import { SidebarFooterButton } from './SidebarFooterButton';

export const LocalStudioSidebar: WithLoadingSkeleton = () => {
  const { isLoading, data } = useDiscover();

  const goToCloudDashboard = () => {
    window.open(window.location.origin, '_blank');
  };

  return (
    <Aside>
      <LocalStudioSidebarContent workflows={data?.workflows ?? []} isLoading={isLoading} />
      <SidebarFooterButton onClick={goToCloudDashboard} Icon={IconCloudQueue}>
        Open Cloud Dashboard
      </SidebarFooterButton>
    </Aside>
  );
};

LocalStudioSidebar.LoadingDisplay = () => (
  <Aside>
    <LocalStudioSidebarContent.LoadingDisplay />
  </Aside>
);
