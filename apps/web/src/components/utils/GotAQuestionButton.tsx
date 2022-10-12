import { Button, Size } from '../../design-system';

function onClick() {
  window?.open('https://discord.novu.co', '_blank')?.focus();
}

export function GotAQuestionButton({ mt, size }: { mt: number; size: Size }) {
  return (
    <Button mt={mt} size={size} onClick={onClick}>
      Got a question?
    </Button>
  );
}
