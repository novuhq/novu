import { getProviderOverrideConfig } from '@novu/shared';
import { InlineToast } from '@/components/primitives/inline-toast';
import { getProviderDocReference } from './content-source';

type EscapeHatchCalloutProps = {
  providerId: string;
  displayName: string;
};

export function EscapeHatchCallout({ providerId, displayName }: EscapeHatchCalloutProps) {
  const docReference = getProviderDocReference(providerId);
  const config = getProviderOverrideConfig(providerId);
  // An unregistered provider has no known content key either, so it gets the same caveat.
  const nestsContent = config?.primaryContentKey == null && !config?.seedWhenAbsent;
  const seedHint = config?.seedWhenAbsent?.escapeHatchHint;

  return (
    <InlineToast
      variant="tip"
      description={
        <>
          No schema available. This object is merged into the {displayName} API payload as-is; fields aren't validated
          or autocompleted.
          {seedHint ? (
            <> {seedHint}</>
          ) : (
            nestsContent && (
              <> {displayName} nests its message content, so the step body is not filled in automatically here.</>
            )
          )}
          {docReference && (
            <>
              {' '}
              <a href={docReference} target="_blank" rel="noopener noreferrer" className="text-text-sub underline">
                {displayName} API reference
              </a>
            </>
          )}
        </>
      }
    />
  );
}
