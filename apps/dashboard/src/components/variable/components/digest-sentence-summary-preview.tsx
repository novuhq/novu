import { VariablePreview } from './variable-preview';

export function DigestSentenceSummaryPreview() {
  return (
    <VariablePreview>
      <VariablePreview.Content>
        <img src="/images/novu-logo-dark.svg" className="w-24" alt="logo" />
        <p className="text-xs text-neutral-950">Radek, Dima and 5 others replied to your post</p>
      </VariablePreview.Content>
      <VariablePreview.Description>
        <p className="text-text-sub text-2xs">Summarizes digest based on a key.</p>
      </VariablePreview.Description>
    </VariablePreview>
  );
}
