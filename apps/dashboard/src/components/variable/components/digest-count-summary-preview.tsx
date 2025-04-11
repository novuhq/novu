import { VariablePreview } from './variable-preview';

export function DigestCountSummaryPreview() {
  return (
    <VariablePreview>
      <VariablePreview.Content>
        <img src="/images/novu-logo-dark.svg" className="w-24" alt="logo" />
        <p className="text-xs text-neutral-950">You have 2 unread notifications on Novu</p>
      </VariablePreview.Content>
      <VariablePreview.Description>
        <p className="text-text-sub text-2xs">Summarizes based on events count.</p>
      </VariablePreview.Description>
    </VariablePreview>
  );
}
