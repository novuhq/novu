import React, { memo, useEffect } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import { colors, TemplateButton } from '../../design-system';
import { TapeGradient } from '../../design-system/icons';

export default memo(({ id, selected }: { id: string; selected: boolean }) => {
  useEffect(() => {
    console.log('trigger selected', selected);
  }, [selected]);

  return (
    <div data-id={id}>
      <TemplateButton
        data-id={id}
        Icon={TapeGradient}
        description={'bla'}
        label={'Trigger'}
        tabKey={'TriggerSnippet'}
        changeTab={() => {}}
      />

      <Handle
        type="source"
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
