import { BadgeProps, Badge as MantineBadge, MantineTheme, useMantineTheme } from '@mantine/core';
import { css } from '@novu/novui/css';

export const Badge = ({ label, ...props }: BadgeProps & { label?: React.ReactNode }) => {
  const theme = useMantineTheme();

  return (
    <MantineBadge className={styles.badge(theme)} {...props}>
      {label}
    </MantineBadge>
  );
};

const styles = {
  badge: (theme: MantineTheme) =>
    css({
      // TODO: replace with 'mauve.80' color token when legacy tokens are removed
      background: theme.colorScheme === 'dark' ? '#2E2E32 !important' : '#e4e2e4ff !important',
      padding: '2px 8px !important',
      color: theme.colorScheme === 'dark' ? '#7E7D86' : '#86848dff',
      borderRadius: '24px !important',
    }),
};
