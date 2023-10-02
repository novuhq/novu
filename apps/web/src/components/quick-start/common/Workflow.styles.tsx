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
    background: transparent;
    opacity: 0.5;
  }

  .react-flow__attribution a {
    color: deeppink !important;
    text-decoration: underline;
    font-size: initial;
    margin-top: 15px;
  }

  .react-flow__attribution.right {
    right: 173px;
  }

  .react-flow__attribution.bottom {
    bottom: -5px;
  }

  .react-flow__attribution a:hover {
    color: lightpink !important;
    text-decoration: underline;
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
