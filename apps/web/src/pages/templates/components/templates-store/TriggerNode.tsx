import { Handle, NodeProps, Position } from 'react-flow-renderer';
import styled from '@emotion/styled';

import { NodeStep } from '../../../../components/workflow';
import { TurnOnGradient } from '../../../../design-system/icons';

const NodeStepStyled = styled(NodeStep)`
  width: 200px;
`;

export const TriggerNode = ({ data }: NodeProps) => {
  return (
    <NodeStepStyled
      data={data}
      Icon={TurnOnGradient}
      Handlers={() => {
        return (
          <>
            <Handle type="source" position={Position.Bottom} />
          </>
        );
      }}
    />
  );
};
