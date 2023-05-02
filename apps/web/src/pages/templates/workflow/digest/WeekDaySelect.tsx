import { Group, UnstyledButton } from '@mantine/core';
import { DaysEnum } from '@novu/shared';
import { useEffect, useState } from 'react';
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

export const WeekDaySelect = ({ onChange = (value: DaysEnum[]) => {}, value = [], disabled = false }) => {
  const [selected, setSelected] = useState<DaysEnum[]>(value);

  useEffect(() => {
    onChange(selected);
  }, [selected]);

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
            disabled={disabled}
            last={items.length - 1 === index}
            onClick={(clicked) => {
              if (selected.includes(clicked)) {
                setSelected([...selected].filter((item) => item !== clicked).sort());

                return;
              }
              setSelected([...selected, clicked].sort());
            }}
            active={selected.includes(day.value)}
          />
        );
      })}
    </Group>
  );
};
