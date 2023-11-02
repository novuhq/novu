import { Grid, UnstyledButton, createStyles, MantineTheme } from '@mantine/core';
import { colors } from '@novu/design-system';

const useStyles = createStyles<string, { active: boolean; disabled: boolean }>((theme: MantineTheme, _params) => {
  const active = _params.active;
  const disabled = _params.disabled;
  const isDark = theme.colorScheme === 'dark';

  const border = `1px solid ${isDark ? colors.B30 : colors.B60}`;

  return {
    day: {
      button: {
        borderBottom: border,
        borderLeft: border,
        padding: '7px 0',
        textAlign: 'center',
        width: '100%',
        background: active ? colors.B60 : undefined,
        color: active ? colors.white : isDark ? colors.B80 : colors.B60,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
        borderColor: isDark ? colors.B30 : colors.B60,
      },
      '&:nth-of-type(1) button': {
        borderTopLeftRadius: 4,
        borderTop: border,
      },
      '&:nth-of-type(2) button': {
        borderTop: border,
      },
      '&:nth-of-type(3) button': {
        borderTop: border,
      },
      '&:nth-of-type(4) button': {
        borderTop: border,
      },
      '&:nth-of-type(5) button': {
        borderTop: border,
      },
      '&:nth-of-type(6) button': {
        borderTop: border,
      },
      '&:nth-of-type(7) button': {
        borderRight: border,
        borderTopRightRadius: 4,
        borderTop: border,
      },
      '&:nth-of-type(14) button': {
        borderRight: border,
      },
      '&:nth-of-type(21) button': {
        borderRight: border,
      },
      '&:nth-of-type(28) button': {
        borderRight: border,
      },
      '&:nth-of-type(29) button': {
        borderBottomLeftRadius: 4,
      },
      '&:nth-of-type(31) button': {
        borderRight: border,
      },
    },
  };
});

const Day = ({ label, value, onClick, active, disabled = false }) => {
  const { classes } = useStyles({ active, disabled });

  return (
    <Grid.Col className={classes.day} span={1}>
      <UnstyledButton
        onClick={() => {
          onClick(value);
        }}
        className={active ? 'active-day' : undefined}
        disabled={disabled}
      >
        {label}
      </UnstyledButton>
    </Grid.Col>
  );
};

const items: number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
];

export const DaySelect = ({
  onChange = (value: number[]) => {},
  value = [],
  disabled = false,
}: {
  onChange: (value: number[]) => void;
  value: number[];
  disabled?: boolean;
}) => {
  return (
    <Grid data-test-id="day-select" gutter={0} columns={7} mt={10}>
      {items.map((day) => {
        return (
          <Day
            label={day}
            value={day}
            key={day}
            disabled={disabled}
            onClick={(clicked) => {
              if (value.includes(clicked)) {
                onChange([...value].filter((item) => item !== clicked).sort());

                return;
              }
              onChange([...value, clicked].sort());
            }}
            active={value.includes(day)}
          />
        );
      })}
    </Grid>
  );
};
