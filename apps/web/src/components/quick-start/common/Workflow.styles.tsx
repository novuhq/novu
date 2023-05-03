import styled from '@emotion/styled';
import { colors } from '../../../design-system';

export const WorkflowWrapper = styled.div<{ height: string }>`
  height: ${({ height }) => height};
  width: 100%;
  background-color: transparent;

  .react-flow__node.react-flow__node-triggerNode,
  .react-flow__node.react-flow__node-digestNode,
  .react-flow__node.react-flow__node-emailNode {
    cursor: default;
  }

  .react-flow__attribution {
    display: none;
  }

  .react-flow__handle {
    background: transparent;
    border: 1px solid ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.B60)};
  }

  .react-flow__edge-path {
    stroke: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.B60)};
    border-radius: 10px;
    stroke-dasharray: 5;
    stroke-width: 1px;
  }
`;
