import { DaysEnum } from '@novu/shared';
import { createStyles, Group, MantineTheme, UnstyledButton } from '@mantine/core';
import { colors } from '@novu/design-system';

const useStyles = createStyles<string, { active: boolean; disabled: boolean; last: boolean }>(
  (theme: MantineTheme, _params) => {
    const active = _params.active;
    const disabled = _params.disabled;
    const last = _params.last;
    const isDark = theme.colorScheme === 'dark';

    const border = `1px solid ${isDark ? colors.B30 : colors.B60}`;

    return {
      day: {
        borderRight: last ? undefined : border,
        padding: '8px',
        textAlign: 'center',
        background: active ? colors.B60 : undefined,
        color: active ? colors.white : isDark ? colors.B80 : colors.B60,
        borderColor: isDark ? colors.B30 : colors.B60,
        cursor: disabled ? 'default' : 'pointer',
      },
      days: {
        border,
        borderRadius: 4,
        width: 'auto',
        overflow: 'hidden',
        marginTop: 24,
        opacity: disabled ? 0.4 : 1,
      },
    };
  }
);

const Day = ({ last, label, value, onClick, active, disabled = false }) => {
  const { classes } = useStyles({ active, disabled, last });

  return (
    <UnstyledButton
      onClick={() => {
        onClick(value);
      }}
      className={`${classes.day} ${active ? 'active-day' : undefined}`}
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
  const { classes } = useStyles({ active: false, disabled, last: false });

  return (
    <Group data-test-id="weekday-select" grow spacing={0} className={classes.days}>
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
