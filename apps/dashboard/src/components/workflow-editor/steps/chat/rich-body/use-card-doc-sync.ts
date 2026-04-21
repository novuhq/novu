import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { CardElementLikeJson } from './card-serializer';
import { cardElementToDoc, docToCardElement, docToFallbackText } from './card-serializer';
import type { ChatCardDoc } from './card-types';

/**
 * Binds the in-memory `ChatCardDoc` to the two form fields it fans out to:
 *   - `card` — the structured `CardElement` JSON (source of truth for rich
 *     authoring, fed to the backend compiler).
 *   - `body` — the plain-text flattening (legacy field, kept in sync so
 *     providers without rich rendering still receive a coherent fallback).
 *
 * Writes are debounced via the usual react-hook-form `setValue` path.
 * Reads hydrate the doc once from whichever field is populated — giving
 * us graceful recovery if `card` is present but `body` is stale, and
 * vice versa.
 */
export function useCardDocSync(): {
  doc: ChatCardDoc;
  updateDoc: (mutator: (draft: ChatCardDoc) => ChatCardDoc) => void;
  replaceDoc: (next: ChatCardDoc) => void;
  /**
   * True when the underlying form had a non-empty `body` string but no
   * `card` at the time the editor mounted. UI uses this to show the
   * "upgraded to rich" nudge once.
   */
  isLegacyUpgrade: boolean;
} {
  const { setValue, getValues, control } = useFormContext<{
    body?: string;
    card?: CardElementLikeJson | Record<string, unknown>;
  }>();

  const card = useWatch({ control, name: 'card' }) as CardElementLikeJson | undefined;
  const body = useWatch({ control, name: 'body' }) as string | undefined;

  const isLegacyUpgradeRef = useRef(false);
  const initializedRef = useRef(false);

  const doc = useMemo<ChatCardDoc>(() => {
    if (card && typeof card === 'object' && (card as { type?: string }).type === 'card') {
      return cardElementToDoc(card as CardElementLikeJson);
    }

    if (!initializedRef.current && typeof body === 'string' && body.trim().length > 0) {
      // Upgrade legacy body-only content into a single Text block on first
      // hydration. We only do this once per mount to avoid fighting the
      // user if they later clear the card back to empty.
      isLegacyUpgradeRef.current = true;

      return {
        blocks: [{ id: `t_${Math.random().toString(36).slice(2, 10)}`, kind: 'text', content: body }],
      };
    }

    return { blocks: [] };
  }, [card, body]);

  useEffect(() => {
    initializedRef.current = true;
  }, []);

  const persist = useCallback(
    (next: ChatCardDoc) => {
      const cardJson = docToCardElement(next);
      const text = docToFallbackText(next);
      setValue('card', cardJson, { shouldDirty: true, shouldValidate: false });
      setValue('body', text, { shouldDirty: true, shouldValidate: false });
    },
    [setValue]
  );

  const updateDoc = useCallback<ReturnType<typeof useCardDocSync>['updateDoc']>(
    (mutator) => {
      const current = (() => {
        const currentCard = getValues('card') as CardElementLikeJson | undefined;
        if (currentCard && typeof currentCard === 'object' && (currentCard as { type?: string }).type === 'card') {
          return cardElementToDoc(currentCard);
        }

        return doc;
      })();
      const next = mutator(current);
      persist(next);
    },
    [doc, getValues, persist]
  );

  const replaceDoc = useCallback<ReturnType<typeof useCardDocSync>['replaceDoc']>((next) => persist(next), [persist]);

  return { doc, updateDoc, replaceDoc, isLegacyUpgrade: isLegacyUpgradeRef.current };
}
