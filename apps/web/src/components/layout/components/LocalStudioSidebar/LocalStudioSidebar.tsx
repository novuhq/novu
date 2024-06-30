import { WithLoadingSkeleton } from '@novu/novui';
import { css, cva } from '@novu/novui/css';
import { styled } from '@novu/novui/jsx';
import { useDiscover } from '../../../../studio/hooks/useBridgeAPI';
import { LocalStudioSidebarContent } from './LocalStudioSidebarContent';

const Aside = styled(
  'aside',
  cva({
    base: {
      position: 'sticky',
      top: '0',
      zIndex: 'auto',
      backgroundColor: 'transparent',
      borderRight: 'none',
      width: '[272px]',
      height: 'full',
      p: '50',
      bg: 'surface.panel',
      overflowY: 'auto',
    },
  })
);

export const LocalStudioSidebar: WithLoadingSkeleton = () => {
  const { isLoading, data } = useDiscover();

  return (
    <Aside>
      <LocalStudioSidebarContent workflows={data?.workflows ?? []} isLoading={isLoading} />
    </Aside>
  );
};

LocalStudioSidebar.LoadingDisplay = () => (
  <Aside>
    <LocalStudioSidebarContent.LoadingDisplay />
  </Aside>
);
