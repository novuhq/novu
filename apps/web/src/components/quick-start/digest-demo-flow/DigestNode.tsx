import { Handle, Position } from 'react-flow-renderer';
import { createStyles, NumberInput, Loader } from '@mantine/core';
import styled from '@emotion/styled';

import { NodeStepWithPopover } from './NodeStepWithPopover';
import { CountdownTimer, DigestAction, colors } from '@novu/design-system';
import { useDigestDemoFlowContext } from './DigestDemoFlowProvider';
import { Indicator } from './Indicator';
import { useEffect, useState } from 'react';
import { useInterval } from '@mantine/hooks';
import { useDataRef } from '../../../hooks';

const LoaderStyled = styled(Loader)`
  position: absolute;
  bottom: 4px;
  right: 4px;
`;

export const useNumberInputStyles = createStyles((theme) => {
  const dark = theme.colorScheme === 'dark';

  return {
    icon: {
      color: dark ? colors.white : colors.B40,
      width: 24,
      height: 24,
      top: 8,
    },
    input: {
      fontSize: 16,
      textAlign: 'center',
      paddingLeft: '24px !important',
      border: 'none',
      width: 110,
      backgroundColor: 'transparent',
      '&:disabled': {
        backgroundColor: 'transparent',
      },
    },
    control: {
      border: 'none',
      borderRadius: 4,
    },
  };
});

export function DigestNode({ data, id }: { data: any; id: string }) {
  const { isReadOnly, triggerCount, isRunningDigest, digestInterval, updateDigestInterval } =
    useDigestDemoFlowContext();
  const { classes } = useNumberInputStyles();

  const [seconds, setSeconds] = useState(0);
  const interval = useInterval(() => setSeconds((sec) => sec - 1), 1000);
  const intervalRef = useDataRef({ interval, digestInterval });

  useEffect(() => {
    const { interval: intervalObject, digestInterval: currentDigestInterval } = intervalRef.current;
    if (isRunningDigest) {
      setSeconds(currentDigestInterval);
      intervalObject.start();
    } else {
      intervalObject.stop();
    }

    return intervalObject.stop;
  }, [isRunningDigest, intervalRef]);

  const digestIntervalDisplay = !isRunningDigest ? digestInterval : seconds;

  return (
    <NodeStepWithPopover
      data={data}
      id={id}
      Icon={DigestAction}
      ContentItem={
        <>
          <Indicator isShown={!isReadOnly && triggerCount > 0} value={triggerCount > 99 ? '99' : `${triggerCount}`} />
          {isRunningDigest && <LoaderStyled color={colors.B70} size={16} />}
        </>
      }
      ActionItem={
        !isReadOnly && (
          <NumberInput
            value={digestIntervalDisplay}
            onChange={updateDigestInterval}
            max={30}
            min={10}
            parser={(value) => (value ?? '').replace(/( \w+)|(\D{1,3})/g, '')}
            formatter={(value) => `${value} sec`}
            icon={<CountdownTimer />}
            disabled={isRunningDigest}
            classNames={classes}
          />
        )
      }
      Handlers={() => {
        return (
          <>
            <Handle type="target" id="b" position={Position.Top} />
            <Handle type="source" id="a" position={Position.Bottom} />
          </>
        );
      }}
    />
  );
}
