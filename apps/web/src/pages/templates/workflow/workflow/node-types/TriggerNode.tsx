import { StepTypeEnum } from '@novu/shared';
import { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from 'react-flow-renderer';

import { createStyles, Stack, useMantineColorScheme } from '@mantine/core';
import { useDidUpdate } from '@mantine/hooks';
import { useFormContext } from 'react-hook-form';
import { When } from '../../../../../components/utils/When';
import { colors, Tooltip, BoltOutlinedGradient, Check } from '@novu/design-system';
import { IForm } from '../../../components/formTypes';
import { WorkflowNode } from './WorkflowNode';
import { INode } from '../../../../../components/workflow/types';

const useStyles = createStyles(
  (
    theme,
    params: {
      animate: boolean;
    }
  ) => ({
    savedIcon: {
      position: 'absolute',
      top: -11,
      right: -11,
      zIndex: 99999,
      height: 22,
      width: 22,
      borderRadius: 22,
      background: colors.success,
      animation: `fade-in-save-icon 2s linear 0s${params.animate ? ', pulse-animation-save-icon 2s linear 2s 3' : ''}`,
      '@keyframes fade-in-save-icon': {
        '0%': {
          opacity: 0,
        },
        '100%': {
          opacity: 1,
        },
      },
      '@keyframes pulse-animation-save-icon': {
        '0%': {
          boxShadow: '0 0 0 0 rgb(77, 153, 128, 0.7)',
        },
        '70%': {
          boxShadow: '0 0 0 10px rgba(77, 153, 128, 0)',
        },
        '100%': {
          boxShadow: '0 0 0 0 rgba(77, 153, 128, 0)',
        },
      },
    },
  })
);

export default memo(({ selected }: INode) => {
  const { getNodes } = useReactFlow();
  const isParent = getNodes().length > 1;
  const noChildStyle = isParent ? {} : { border: 'none', background: 'transparent' };
  const {
    formState: { isDirty },
  } = useFormContext<IForm>();
  const theme = useMantineColorScheme();
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const { classes } = useStyles({
    animate: shouldAnimate,
  });

  useDidUpdate(() => {
    setShouldAnimate(true);
  }, [isDirty]);

  return (
    <div data-test-id={'node-triggerSelector'} style={{ pointerEvents: 'none', width: '100%' }}>
      <When truthy={!isDirty}>
        <Tooltip label="Workflow is saved">
          <div className={classes.savedIcon}>
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
      <WorkflowNode
        Icon={BoltOutlinedGradient}
        label="Workflow trigger"
        active={selected}
        channelType={StepTypeEnum.TRIGGER}
        subtitle="Notification call"
      />
      <Handle style={noChildStyle} type="source" id="a" position={Position.Bottom} />
    </div>
  );
});
