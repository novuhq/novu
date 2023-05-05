import { DaysEnum } from '@novu/shared';
import { Group, UnstyledButton } from '@mantine/core';
import { colors } from '../../../../design-system';

const Day = ({ last, label, value, onClick, active, disabled = false }) => {
  return (
    <UnstyledButton
      onClick={() => {
        onClick(value);
      }}
      style={{
        borderRight: last ? undefined : `1px solid ${colors.B30}`,
        padding: '8px',
        textAlign: 'center',
        background: active ? colors.B60 : undefined,
        color: active ? colors.white : colors.B80,
        borderColor: colors.B30,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {label}
    </UnstyledButton>
  );
};

const items = [
  {
    label: 'Mon',
    value: DaysEnum.MONDAY,
  },
  {
    label: 'Tue',
    value: DaysEnum.TUESDAY,
  },
  {
    label: 'Wed',
    value: DaysEnum.WEDNESDAY,
  },
  {
    label: 'Thu',
    value: DaysEnum.THURSDAY,
  },
  {
    label: 'Fri',
    value: DaysEnum.FRIDAY,
  },
  {
    label: 'Sat',
    value: DaysEnum.SATURDAY,
  },
  {
    label: 'Sun',
    value: DaysEnum.SUNDAY,
  },
];

export const WeekDaySelect = ({
  onChange = (value: DaysEnum[]) => {},
  value = [],
  disabled = false,
}: {
  onChange: (value: DaysEnum[]) => void;
  value: DaysEnum[];
  disabled?: boolean;
}) => {
  return (
    <Group
      grow
      spacing={0}
      sx={{
        border: `1px solid ${colors.B30}`,
        borderRadius: 4,
        width: 'auto',
        overflow: 'hidden',
        marginTop: 24,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {items.map((day, index) => {
        return (
          <Day
            label={day.label}
            value={day.value}
            key={day.value}
            disabled={disabled}
            last={items.length - 1 === index}
            onClick={(clicked) => {
              if (value.includes(clicked)) {
                onChange([...value].filter((item) => item !== clicked).sort());

                return;
              }
              onChange([...value, clicked].sort());
            }}
            active={value.includes(day.value)}
          />
        );
      })}
    </Group>
  );
};
