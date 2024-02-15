import styled from '@emotion/styled';
import { Flex, FlexProps } from '@mantine/core';
import { clamp } from '@mantine/hooks';
import { Button, ChevronDown, ChevronUp, colors, CountdownTimer, IButtonProps, Text } from '@novu/design-system';
import { Dispatch, SetStateAction } from 'react';

const DEFAULT_STEP = 1;
const DEFAULT_MIN = 1;
const DEFAULT_MAX = 60;
const DEFAULT_UNIT_LABEL = 'sec';

const IconButton = styled(Button)<IButtonProps>(
  ({ theme }) => `
  padding: 0;
  background-image: none;
  background: transparent;
  height: inherit;

  & span {
    background-image: none;
  }

  & path {
    fill: ${theme.colorScheme === 'dark' ? colors.white : colors.B60};
  }

  &:disabled path {
    opacity: 40%;
  }
`
);

const StyledTimeValue = styled(Text)`
  // leave room for 2 digits
  min-width: 2ch;
`;
export interface ITimerControlProps extends FlexProps {
  value: number;
  setValue: Dispatch<SetStateAction<number>>;
  step?: number;
  min?: number;
  max?: number;
  unitLabel?: string;
}

export const TimerControl: React.FC<ITimerControlProps> = ({
  value,
  setValue,
  unitLabel = DEFAULT_UNIT_LABEL,
  step = DEFAULT_STEP,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  ...flexProps
}) => {
  const clampValue = (val: number) => clamp(val, min, max);

  const increment = () => {
    setValue((prevVal) => clampValue(prevVal + step));
  };

  const decrement = () => {
    setValue((prevVal) => clampValue(prevVal - step));
  };

  const canIncrement = value + step <= max;
  const canDecrement = value - step >= min;

  return (
    <Flex align="center" {...flexProps} gap="0.5rem">
      <CountdownTimer width={'1.25rem'} height={'1.25rem'} />
      <Flex gap="0.25rem">
        <StyledTimeValue align="center">{value}</StyledTimeValue>
        <Text>{unitLabel}</Text>
      </Flex>
      <Flex direction={'column'} gap="0.25rem">
        <IconButton onClick={increment} disabled={!canIncrement}>
          <ChevronUp />
        </IconButton>
        <IconButton onClick={decrement} disabled={!canDecrement}>
          <ChevronDown />
        </IconButton>
      </Flex>
    </Flex>
  );
};
