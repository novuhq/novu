import { showNotification } from '@mantine/notifications';
import { useMutation } from 'react-query';
import { bulkPromoteChanges } from '../../api/changes';

export function showDefaultNotification() {
  const { mutate, isLoading } = useMutation(bulkPromoteChanges, {
    onSuccess: () => {
    showNotification({
       message: 'Default notification',
       autoClose: false, 
    }),
}