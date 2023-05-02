import { Grid, UnstyledButton } from '@mantine/core';
import { useEffect, useState } from 'react';
import { colors } from '../../../design-system';

const border = `1px solid ${colors.B30}`;

const Day = ({ label, value, onClick, active, style = {}, disabled = false }) => {
  return (
    <Grid.Col span={1}>
      <UnstyledButton
        onClick={() => {
          onClick(value);
        }}
        disabled={disabled}
        style={{
          borderBottom: border,
          borderLeft: border,
          padding: '7px 0',
          textAlign: 'center',
          width: '100%',
          background: active ? colors.B60 : undefined,
          color: active ? colors.white : colors.B80,
          ...style,
          opacity: disabled ? 0.4 : 1,
          cursor: disabled ? 'default' : 'pointer',
          borderColor: colors.B30,
        }}
      >
        {label}
      </UnstyledButton>
    </Grid.Col>
  );
};

const items = [
  {
    value: 1,
    style: {
      borderTopLeftRadius: 4,
      borderTop: border,
    },
  },
  {
    value: 2,
    style: {
      borderTop: border,
    },
  },
  {
    value: 3,
    style: {
      borderTop: border,
    },
  },
  {
    value: 4,
    style: {
      borderTop: border,
    },
  },
  {
    value: 5,
    style: {
      borderTop: border,
    },
  },
  {
    value: 6,
    style: {
      borderTop: border,
    },
  },
  {
    value: 7,
    style: {
      borderRight: border,
      borderTopRightRadius: 4,
      borderTop: border,
    },
  },
  {
    value: 8,
  },
  {
    value: 9,
  },
  {
    value: 10,
  },
  {
    value: 11,
  },
  {
    value: 12,
  },
  {
    value: 13,
  },
  {
    value: 14,
    style: {
      borderRight: border,
    },
  },
  {
    value: 15,
  },
  {
    value: 16,
  },
  {
    value: 17,
  },
  {
    value: 18,
  },
  {
    value: 19,
  },
  {
    value: 20,
  },
  {
    value: 21,
    style: {
      borderRight: border,
    },
  },
  {
    value: 22,
  },
  {
    value: 23,
  },
  {
    value: 24,
  },
  {
    value: 25,
  },
  {
    value: 26,
  },
  {
    value: 27,
  },
  {
    value: 28,
    style: {
      borderRight: border,
    },
  },
  {
    value: 29,
    style: {
      borderBottomLeftRadius: 4,
    },
  },
  {
    value: 30,
  },
  {
    value: 31,
    style: {
      borderRight: border,
    },
  },
];

export const DaySelect = ({ onChange = (value: number[]) => {}, value = [], disabled = false }) => {
  const [selected, setSelected] = useState<number[]>(value);

  useEffect(() => {
    onChange(selected);
  }, [selected]);

  return (
    <Grid gutter={0} columns={7} mt={10}>
      {items.map((day) => {
        return (
          <Day
            label={day.value}
            value={day.value}
            style={day.style}
            disabled={disabled}
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
    </Grid>
  );
};
