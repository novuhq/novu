import React, { useMemo } from 'react';
import { useOutletRenderer } from '../hooks/internal/useOutletRenderer';
import { BellRenderer } from '../utils/types';
import { Mounter } from './Mounter';
import { OutletScope } from './OutletScope';

export type BellProps = {
  renderBell?: BellRenderer;
};

const BellMount = (props: BellProps) => {
  const renderBell = useOutletRenderer(props.renderBell);

  const mountProps = useMemo(() => (renderBell ? { renderBell } : undefined), [renderBell]);

  return <Mounter name="Bell" props={mountProps} />;
};

export const Bell = React.memo((props: BellProps) => (
  <OutletScope>
    <BellMount {...props} />
  </OutletScope>
));

Bell.displayName = 'Bell';
