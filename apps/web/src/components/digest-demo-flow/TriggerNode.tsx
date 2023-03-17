import React from 'react';
import { Handle, Position } from 'react-flow-renderer';
import { useMantineTheme } from '@mantine/core';

import { NodeStep } from './NodeStep';
import { TurnOnGradient } from '../../design-system/icons/gradient/TurnOnGradient';
import { Button, colors } from '../../design-system';
import { useDigestDemoFlowContext } from './DigestDemoFlowProvider';

export function TriggerNode({ data, id }: { data: any; id: string }) {
  const { isReadOnly, runTrigger } = useDigestDemoFlowContext();
  const ActionItem = data.ActionItem as React.FC<any>;
  const { colorScheme } = useMantineTheme();

  return (
    <NodeStep
      data={data}
      id={id}
      Icon={TurnOnGradient}
      ActionItem={
        ActionItem ? (
          <ActionItem style={{ color: `${colorScheme === 'dark' ? colors.B40 : colors.B80}` }} />
        ) : !isReadOnly ? (
          <Button variant="outline" onClick={runTrigger}>
            Run Trigger
          </Button>
        ) : undefined
      }
      Handlers={() => {
        return (
          <>
            <Handle type="source" id="a" position={Position.Bottom} />
          </>
        );
      }}
    />
  );
}
