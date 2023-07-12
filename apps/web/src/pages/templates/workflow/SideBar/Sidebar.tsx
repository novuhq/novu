import { Container, Group, Stack, useMantineColorScheme } from '@mantine/core';
import { colors } from '@novu/notification-center';
import { Background, BackgroundVariant } from 'react-flow-renderer';
import { AddStepMenu } from './AddStepMenu';
import styled from '@emotion/styled';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from '../../../../design-system';
import { Settings } from '../../../../design-system/icons';
import { useBasePath } from '../../hooks/useBasePath';
import { useFormContext } from 'react-hook-form';
import { IForm } from '../../components/formTypes';
import { useDidUpdate, useTimeout } from '@mantine/hooks';
import { useState } from 'react';
import { UpdateButton } from '../../components/UpdateButton';
import { useEnvController } from '../../../../hooks';
import { When } from '../../../../components/utils/When';

export const Sidebar = () => {
  const { colorScheme } = useMantineColorScheme();
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };
  const { setDragging }: any = useOutletContext();
  const { readonly } = useEnvController();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const {
    formState: { isDirty },
  } = useFormContext<IForm>();
  const [shouldPulse, setShouldPulse] = useState(false);

  useDidUpdate(() => {
    if (isDirty) {
      return;
    }
    setShouldPulse(true);
    start();
  }, [isDirty]);

  const { start } = useTimeout(() => {
    setShouldPulse(false);
  }, 5000);

  return (
    <>
      <Container fluid sx={{ width: '100%', paddingLeft: 0, height: '74px' }}>
        <Stack
          justify="center"
          sx={{
            height: '100%',
          }}
        >
          <Group>
            <UpdateButton />
            <Button
              pulse={shouldPulse}
              onClick={() => {
                navigate(basePath + '/snippet');
              }}
              data-test-id="get-snippet-btn"
            >
              Get Snippet
            </Button>
            <Link data-test-id="settings-page" to="settings">
              <Settings />
            </Link>
          </Group>
        </Stack>
      </Container>
      <When truthy={!readonly}>
        <div style={{ position: 'relative', padding: '12px', paddingLeft: 0 }}>
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
      </When>
      <When truthy={readonly}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <Background
            size={1}
            gap={10}
            variant={BackgroundVariant.Dots}
            color={colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
          />
        </div>
      </When>
    </>
  );
};

const SideBarWrapper = styled.div<{ dark: boolean }>`
  background-color: ${({ dark }) => (dark ? colors.B17 : colors.white)} !important;
  position: relative;
  z-index: 1;
  border-radius: 12px;
`;
