import { WithLoadingSkeleton } from '@novu/novui';
import { IconCloudQueue } from '@novu/novui/icons';
import { OutlineButton } from '../../../../studio/components/OutlineButton';
import { useDiscover } from '../../../../studio/hooks/useBridgeAPI';
import { Aside } from '../../../nav/Aside';
import { LocalStudioSidebarContent } from './LocalStudioSidebarContent';
import { SidebarFooter } from './SidebarFooter';

export const LocalStudioSidebar: WithLoadingSkeleton = () => {
  const { isLoading, data } = useDiscover();

  const goToCloudDashboard = () => {
    window.open(window.location.origin, '_blank');
  };

  return (
    <Aside>
      <LocalStudioSidebarContent workflows={data?.workflows ?? []} isLoading={isLoading} />
      <SidebarFooter>
        <OutlineButton fullWidth onClick={goToCloudDashboard} Icon={IconCloudQueue}>
          Open Cloud Dashboard
        </OutlineButton>
      </SidebarFooter>
    </Aside>
  );
};

LocalStudioSidebar.LoadingDisplay = () => (
  <Aside>
    <LocalStudioSidebarContent.LoadingDisplay />
  </Aside>
);
