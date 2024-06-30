import { css } from '@novu/novui/css';
import { FC } from 'react';
import { useDiscover } from '../../../../studio/hooks/useBridgeAPI';
import { LocalStudioSidebarContent } from './LocalStudioSidebarContent';

export const LocalStudioSidebar: FC = () => {
  const { isLoading, data } = useDiscover();

  return (
    <aside
      className={css({
        position: 'sticky',
        top: 0,
        zIndex: 'auto',
        backgroundColor: 'transparent',
        borderRight: 'none',
        width: '272px',
        height: '100%',
        p: '50',
        bg: 'surface.panel',
        overflowY: 'auto',
      })}
    >
      <LocalStudioSidebarContent workflows={data?.workflows ?? []} isLoading={isLoading} />
    </aside>
  );
};
