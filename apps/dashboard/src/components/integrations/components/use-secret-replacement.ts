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

  const isSaved = isMaskedSecret(value) && !isReplacing;

  return {
    isSaved,
    /** Replace was clicked, as opposed to a value arriving from a pasted credentials block. */
    isReplacing,
    /** The field holds, or is waiting for, a replacement of a saved secret, so there is something to cancel back to. */
    canCancel: !isSaved && !!savedValue,
    inputValue: value && !isMaskedSecret(value) ? value : '',
    startReplacing: () => setIsReplacing(true),
    cancel: () => {
      setIsReplacing(false);
      if (savedValue) onChange(savedValue);
    },
    onInputChange: (next: string) => onChange(next === '' && savedValue ? savedValue : next),
  };
}
