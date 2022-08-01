import { showNotification } from '@mantine/notifications';
import { Check } from '../../design-system/icons/general/Check';
import { ErrorIcon } from '../../design-system/icons';

export function showCheckOrError(state: 'success' | 'error', message: string) {
  showNotification({
    message,
    autoClose: false,
    icon: state === 'success' ? <Check /> : <ErrorIcon />,
    styles: (theme) => ({
      icon: {
        width: '22px',
        height: '22px',
        marginRight: '10px',
        backgroundColor: state === 'success' && theme.colorScheme === 'dark' ? '#4D9980' : '#E54545',
      },
    }),
  });
}
