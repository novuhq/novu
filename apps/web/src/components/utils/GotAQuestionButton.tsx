import { useIntercom } from 'react-use-intercom';
import { INTERCOM_APP_ID } from '../../config';
import { Button, Size } from '../../design-system';

const isIntercomEnabled = !!INTERCOM_APP_ID;

export function GotAQuestionButton({ mt, size }: { mt: number; size: Size }) {
  if (!isIntercomEnabled) {
    return null;
  }

  return <QuestionButton mt={mt} size={size} />;
}

function QuestionButton({ mt, size }: { mt: number; size: Size }) {
  const { show } = useIntercom();

  const text = 'Got a question?';

  return (
    <Button mt={mt} size={size} onClick={show}>
      {text}
    </Button>
  );
}
