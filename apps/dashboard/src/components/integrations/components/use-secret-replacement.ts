import { isMaskedSecret } from '@novu/shared';
import { useState } from 'react';

/**
 * A secret field's two states: the saved mask, or an input for its replacement. The form keeps the mask until
 * something is typed, so saving an empty replacement leaves the stored secret as it is.
 */
export function useSecretReplacement({
  value,
  savedValue,
  onChange,
}: {
  value: string | undefined;
  /** The mask of the secret on the server, when there is one. */
  savedValue?: string;
  onChange: (value: string) => void;
}) {
  const [isReplacing, setIsReplacing] = useState(false);

  return {
    isSaved: isMaskedSecret(value) && !isReplacing,
    /** A replacement is being typed over a saved secret, so there is something to cancel back to. */
    canCancel: isReplacing && !!savedValue,
    inputValue: value && !isMaskedSecret(value) ? value : '',
    startReplacing: () => setIsReplacing(true),
    cancel: () => {
      setIsReplacing(false);
      if (savedValue) onChange(savedValue);
    },
    onInputChange: (next: string) => onChange(next === '' && savedValue ? savedValue : next),
  };
}
