import styled from '@emotion/styled';
import { Stack, useMantineColorScheme } from '@mantine/core';
import { useOutletContext } from 'react-router-dom';
import { useEnvironment } from '../../../../hooks';
import { TOP_ROW_HEIGHT } from '../WorkflowEditor';
import { AddStepMenu } from './AddStepMenu';

export const Sidebar = () => {
  const { colorScheme } = useMantineColorScheme();
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    // eslint-disable-next-line no-param-reassign
    event.dataTransfer.effectAllowed = 'move';
  };
  const { setDragging }: any = useOutletContext();
  const { readonly } = useEnvironment();

  if (readonly) {
    return null;
  }

  return (
    <SideBarWrapper dark={colorScheme === 'dark'}>
      <Stack
        sx={{
          height: '100%',
        }}
        justify="center"
        align="center"
      >
        <AddStepMenu setDragging={setDragging} onDragStart={onDragStart} />
      </Stack>
    </SideBarWrapper>
  );
};

const SideBarWrapper = styled.div<{ dark: boolean }>`
  position: absolute;
  top: ${TOP_ROW_HEIGHT}px;
  bottom: 0;
  background: transparent;
  right: 8px;
  z-index: 5;
`;
