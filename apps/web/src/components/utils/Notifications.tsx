import { showNotification } from '@mantine/notifications';
import { Check } from '../../design-system/icons/general/Check';
import { ErrorIcon } from '../../design-system/icons';
import { colors } from '../../design-system';

export function successMessage(state: 'success' | 'error', message: string) {
  showNotification({
    message,
    autoClose: false,
    icon: state === 'success' ? <Check /> : <ErrorIcon />,
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
