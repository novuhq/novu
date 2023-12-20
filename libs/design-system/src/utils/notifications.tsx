import { showNotification } from '@mantine/notifications';
import { colors } from '../config';
import { Check, ErrorIcon } from '../icons';

export function successMessage(message: string, id?: string) {
  showNotification({
    id,
    message,
    icon: <Check />,
    styles: (theme) => ({
      icon: {
        width: '22px',
        height: '22px',
        marginRight: '10px',
        color: theme.colorScheme === 'dark' ? `${colors.B15} !important` : `${colors.white} !important`,
        backgroundColor: colors.success,
      },
    }),
  });
}

export function errorMessage(message: string) {
  showNotification({
    message,
    icon: <ErrorIcon />,
    styles: (theme) => ({
      icon: {
        width: '22px',
        height: '22px',
        marginRight: '10px',
        color: `${colors.error} !important`,
        backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
      },
    }),
  });
}
