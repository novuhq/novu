import { useCallback, useEffect, useState } from 'react';
import { IntercomContextValues, useIntercom } from 'react-use-intercom';

import { INTERCOM_APP_ID } from '../../config';
import { Button, Size } from '../../design-system';

const useShowIntercom = () => {
  const { show } = useIntercom();
  const [isIntercomEnabled] = useState<boolean>(!!INTERCOM_APP_ID);

  return useCallback(() => isIntercomEnabled && show(), [isIntercomEnabled, show]);
};

export function GotAQuestionButton({ mt, size }: { mt: number; size: Size }) {
  const showIntercom = useShowIntercom();

  const text = 'Got a question?';

  return (
    showIntercom && (
      <Button mt={mt} size={size} onClick={showIntercom}>
        {text}
      </Button>
    )
  );
}
