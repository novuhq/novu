import { StepTypeEnum } from '@novu/shared';
import { memo } from 'react';
import { Handle, Position, useReactFlow } from 'react-flow-renderer';

import { WorkflowNode } from './WorkflowNode';
import { Check, TapeGradient } from '../../../../../design-system/icons';
import { Stack, useMantineColorScheme } from '@mantine/core';
import { colors, Tooltip } from '../../../../../design-system';
import { useFormContext } from 'react-hook-form';
import { IForm } from '../../../components/formTypes';
import { When } from '../../../../../components/utils/When';

export default memo(({ selected }: { selected: boolean }) => {
  const { getNodes } = useReactFlow();
  const isParent = getNodes().length > 2;
  const noChildStyle = isParent ? {} : { border: 'none', background: 'transparent' };
  const {
    formState: { isDirty },
  } = useFormContext<IForm>();
  const theme = useMantineColorScheme();

  return (
    <div data-test-id={'node-triggerSelector'} style={{ position: 'relative' }}>
      <When truthy={!isDirty}>
        <Tooltip label="Workflow is saved">
          <div
            style={{
              position: 'absolute',
              top: -11,
              right: -11,
              zIndex: 99999,
              height: 22,
              width: 22,
              borderRadius: 22,
              background: colors.success,
            }}
          >
            <Stack
              justify="center"
              align="center"
              sx={{
                height: '100%',
              }}
            >
              <Check color={theme.colorScheme === 'dark' ? colors.B15 : colors.white} />
            </Stack>
          </div>
        </Tooltip>
      </When>
      <div style={{ pointerEvents: 'none' }}>
        <WorkflowNode
          showDelete={false}
          Icon={TapeGradient}
          label={'Trigger'}
          active={selected}
          channelType={StepTypeEnum.TRIGGER}
        />
        <Handle style={noChildStyle} type="source" id="a" position={Position.Bottom} />
      </div>
    </div>
  );
});
