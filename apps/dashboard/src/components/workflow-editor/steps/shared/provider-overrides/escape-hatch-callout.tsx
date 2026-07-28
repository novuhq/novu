import { ChatProviderIdEnum, getProviderOverrideConfig } from '@novu/shared';
import { InlineToast } from '@/components/primitives/inline-toast';
import { getProviderDocReference } from './content-source';

type EscapeHatchCalloutProps = {
  providerId: string;
  displayName: string;
};

export function EscapeHatchCallout({ providerId, displayName }: EscapeHatchCalloutProps) {
  const docReference = getProviderDocReference(providerId);
  // An unregistered provider has no known content key either, so it gets the same caveat.
  const nestsContent = getProviderOverrideConfig(providerId)?.primaryContentKey == null;
  const isLine = providerId === ChatProviderIdEnum.Line;

  return (
    <InlineToast
      variant="tip"
      description={
        <>
          No schema available. This object is merged into the {displayName} API payload as-is; fields aren't validated
          or autocompleted.
          {isLine ? (
            <>
              {' '}
              If this override sets <code>messages</code>, it replaces the default text message built from the step
              body. Omit <code>messages</code> to send the step body as a text message.
            </>
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
