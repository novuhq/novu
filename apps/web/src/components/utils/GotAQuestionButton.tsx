import { useIntercom } from 'react-use-intercom';

import { INTERCOM_APP_ID } from '../../config';
import { Button, Size } from '../../design-system';

export function GotAQuestionButton({ mt, size }: { mt: number; size: Size }) {
  if (!INTERCOM_APP_ID) {
    return null;
  }

  const { boot } = useIntercom();

  return (
    <Button mt={mt} size={size} onClick={boot}>
      Got a question?
    </Button>
  );
}
