import React, { memo, useEffect } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import { ChannelButton, colors, TemplateButton } from '../../design-system';
import { TapeGradient } from '../../design-system/icons';
import styled from '@emotion/styled';

export default memo(({ id, selected }: { id: string; selected: boolean }) => {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('trigger selected', selected);
  }, [selected]);

  return (
    <div style={{ pointerEvents: 'none' }}>
      <ChannelButton
        Icon={TapeGradient}
        description={'bla'}
        label={'Trigger'}
        tabKey={'TriggerSnippet'}
        active={selected}
        changeTab={() => {}}
      />

      <Handle
        type="source"
        id="a"
        style={{ background: 'transparent', border: `1px solid ${colors.B40}` }}
        position={Position.Bottom}
        onConnect={(params) => {
          // eslint-disable-next-line no-console
          console.log('handle onConnect', params);
        }}
      />
    </div>
  );
});
