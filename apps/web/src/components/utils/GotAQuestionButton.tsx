import { useIntercom } from 'react-use-intercom';
import { INTERCOM_APP_ID } from '../../config';
import { Button, Size } from '@novu/design-system';

interface GotAQuestionButtonProps {
  mt: number;
  size: Size;
}

const isIntercomEnabled = !!INTERCOM_APP_ID;

export function GotAQuestionButton({ mt, size }: GotAQuestionButtonProps) {
  if (!isIntercomEnabled) {
    return null;
  }

  return <QuestionButton mt={mt} size={size} />;
}

function QuestionButton({ mt, size }: GotAQuestionButtonProps) {
  const { show } = useIntercom();

  const text = 'Got a question?';

  return (
    <Button mt={mt} size={size} onClick={show}>
      {text}
    </Button>
  );
}
