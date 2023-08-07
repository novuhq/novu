import styled from '@emotion/styled';
import { Container, Flex, Group, Stack, useMantineColorScheme } from '@mantine/core';
import { useDidUpdate, useTimeout } from '@mantine/hooks';
import { colors } from '@novu/notification-center';
import { useState } from 'react';
import { Background, BackgroundVariant } from 'react-flow-renderer';
import { useFormContext } from 'react-hook-form';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { When } from '../../../../components/utils/When';
import { Button } from '../../../../design-system';
import { Settings } from '../../../../design-system/icons';
import { useEnvController } from '../../../../hooks';
import { IForm } from '../../components/formTypes';
import { UpdateButton } from '../../components/UpdateButton';
import { useBasePath } from '../../hooks/useBasePath';
import { AddStepMenu } from './AddStepMenu';

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
    <Flex direction="column" sx={{ height: '100%' }}>
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
        <div style={{ position: 'relative', flex: '1 1 auto' }}>
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
    </Flex>
  );
};

const SideBarWrapper = styled.div<{ dark: boolean }>`
  position: relative;

  background: ${({ dark }) => (dark ? colors.B15 : colors.B98)};
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
  padding-right: 8px;
`;
