import { type ContentOverrideProviderId, getProviderPrimaryContentKey } from '@novu/shared';
import { InlineToast } from '@/components/primitives/inline-toast';
import { getOverrideProviderConfig, type OverrideChannel } from './content-source';

type EscapeHatchCalloutProps = {
  channel: OverrideChannel;
  providerId: ContentOverrideProviderId;
  displayName: string;
};

export function EscapeHatchCallout({ channel, providerId, displayName }: EscapeHatchCalloutProps) {
  const docReference = getOverrideProviderConfig(channel, providerId)?.docReference;
  const hasPrimaryContentKey = getProviderPrimaryContentKey(providerId) !== null;

  return (
    <InlineToast
      variant="tip"
      description={
        <>
          No schema available. This object is merged into the {displayName} API payload as-is; fields aren't validated
          or autocompleted.
          {!hasPrimaryContentKey && (
            <> {displayName} nests its message content, so the step body is not filled in automatically here.</>
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
