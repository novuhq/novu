import { Container, Group, Stack, useMantineColorScheme } from '@mantine/core';
import { colors } from '@novu/notification-center';
import { Background, BackgroundVariant } from 'react-flow-renderer';
import { AddStepMenu } from './AddStepMenu';
import styled from '@emotion/styled';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from '../../../../design-system';
import { Settings } from '../../../../design-system/icons';
import { useBasePath } from '../../hooks/useBasePath';

export const Sidebar = () => {
  const { colorScheme } = useMantineColorScheme();
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };
  const { setDragging }: any = useOutletContext();
  const navigate = useNavigate();
  const basePath = useBasePath();

  return (
    <>
      <Container fluid sx={{ width: '100%', height: '74px' }}>
        <Group
          position="right"
          sx={{
            height: '100%',
          }}
        >
          <Stack align="center">
            <Group position="apart">
              <Button
                onClick={() => {
                  navigate(basePath + '/snippet');
                }}
              >
                Get Snippet
              </Button>
              <Link to="settings">
                <Settings />
              </Link>
            </Group>
          </Stack>
        </Group>
      </Container>
      <div style={{ position: 'relative', padding: '12px' }}>
        <SideBarWrapper dark={colorScheme === 'dark'}>
          <AddStepMenu setDragging={setDragging} onDragStart={onDragStart} />
        </SideBarWrapper>
        <Background
          size={1}
          gap={10}
          variant={BackgroundVariant.Dots}
          color={colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
        />
      </div>
    </>
  );
};

const SideBarWrapper = styled.div<{ dark: boolean }>`
  background-color: ${({ dark }) => (dark ? colors.B17 : colors.white)} !important;
  position: relative;
  z-index: 1;
  border-radius: 12px;
`;
