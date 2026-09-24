import React, { useMemo } from 'react';
import { useOutletRenderer } from '../hooks/internal/useOutletRenderer';
import { BellRenderer } from '../utils/types';
import { Mounter } from './Mounter';

export type BellProps = {
  renderBell?: BellRenderer;
};

export const Bell = React.memo((props: BellProps) => {
  const renderBell = useOutletRenderer(props.renderBell);

  const mountProps = useMemo(() => (renderBell ? { renderBell } : undefined), [renderBell]);

  return <Mounter name="Bell" props={mountProps} />;
});

Bell.displayName = 'Bell';
