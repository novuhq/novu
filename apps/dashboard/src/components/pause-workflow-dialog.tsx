import TruncatedText from './truncated-text';

export const PauseModalDescription = ({ workflowName }: { workflowName: string }) => (
  <>
    Pausing the <TruncatedText className="max-w-[32ch] font-bold">{workflowName}</TruncatedText> workflow will
    immediately prevent you from being able to trigger it.
  </>
);

export const PAUSE_MODAL_TITLE = 'Proceeding will pause the workflow';
