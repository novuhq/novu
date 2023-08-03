import styled from '@emotion/styled';
import { useMantineColorScheme } from '@mantine/core';
import { useDidUpdate, useTimeout } from '@mantine/hooks';
import { colors } from '@novu/notification-center';
import { useState } from 'react';
import { Background, BackgroundVariant } from 'react-flow-renderer';
import { useFormContext } from 'react-hook-form';
import { useOutletContext } from 'react-router-dom';
import { When } from '../../../../components/utils/When';
import { useEnvController } from '../../../../hooks';
import { IForm } from '../../components/formTypes';
import { AddStepMenu } from './AddStepMenu';

export const Sidebar = () => {
  const { colorScheme } = useMantineColorScheme();
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };
  const { setDragging }: any = useOutletContext();
  const { readonly } = useEnvController();

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
      <When truthy={!readonly}>
        <div style={{ position: 'relative', height: '100%' }}>
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
    </>
  );
};

const SideBarWrapper = styled.div<{ dark: boolean }>`
  position: relative;

  background: ${({ dark }) => (dark ? colors.B15 : colors.B98)};
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding-right: 8px;
`;
