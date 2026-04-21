import type { JSONContent } from '@tiptap/react';
import { useCallback, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  cardElementToPmJson,
  pmToCardElement,
  pmToFallbackText,
  type CardElementLikeJson,
} from './card-serializer';

type CardHeader = {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
};

type FormShape = {
  body?: string;
  card?: CardElementLikeJson | Record<string, unknown>;
};

/**
 * Binds the Tiptap editor + card header inputs to the two form fields
 * they fan out to:
 *   - `card` — structured `CardElement` JSON (source of truth, fed to
 *     the backend compiler).
 *   - `body` — plain-text flattening kept in sync for providers without
 *     rich rendering.
 *
 * The editor owns its own ProseMirror state at runtime. We only hydrate
 * it once on mount from the current `card` value — subsequent updates
 * flow editor → form, not form → editor. The header is edited outside
 * the editor, so its state comes from `useWatch` and writes back via
 * the same merged `setValue('card')` path to keep the tree whole.
 */
export function useCardDocSync(): {
  initialEditorContent: JSONContent;
  onEditorUpdate: (doc: JSONContent) => void;
  header: CardHeader;
  updateHeader: (patch: Partial<CardHeader>) => void;
} {
  const { setValue, getValues, control } = useFormContext<FormShape>();

  const card = useWatch({ control, name: 'card' }) as CardElementLikeJson | undefined;

  /**
   * Seed the Tiptap editor once from whichever form field is populated
   * when the component mounts. We intentionally don't re-hydrate on
   * later form changes — Tiptap owns the doc once it's alive, and
   * re-seeding would stomp the user's selection and focus. `getValues`
   * is stable from react-hook-form, so this effectively runs once.
   */
  const initialEditorContent = useMemo<JSONContent>(() => {
    const initialCard = getValues('card') as CardElementLikeJson | undefined;
    if (initialCard && typeof initialCard === 'object' && (initialCard as { type?: string }).type === 'card') {
      return cardElementToPmJson(initialCard);
    }

    const initialBody = getValues('body');
    if (typeof initialBody === 'string' && initialBody.trim().length > 0) {
      return {
        type: 'doc',
        content: [
          {
            type: 'cardText',
            attrs: { style: 'plain' },
            content: [{ type: 'text', text: initialBody }],
          },
        ],
      };
    }

    return { type: 'doc', content: [] };
  }, [getValues]);

  const header = useMemo<CardHeader>(
    () => ({
      title: typeof card?.title === 'string' ? card.title : undefined,
      subtitle: typeof card?.subtitle === 'string' ? card.subtitle : undefined,
      imageUrl: typeof card?.imageUrl === 'string' ? card.imageUrl : undefined,
    }),
    [card?.title, card?.subtitle, card?.imageUrl]
  );

  const readLatestCard = useCallback((): CardElementLikeJson => {
    const current = getValues('card') as CardElementLikeJson | undefined;
    if (current && typeof current === 'object' && (current as { type?: string }).type === 'card') {
      return current;
    }

    return { type: 'card', children: [] };
  }, [getValues]);

  const onEditorUpdate = useCallback(
    (doc: JSONContent) => {
      const current = readLatestCard();
      const nextCard = pmToCardElement(doc, {
        title: typeof current.title === 'string' ? current.title : undefined,
        subtitle: typeof current.subtitle === 'string' ? current.subtitle : undefined,
        imageUrl: typeof current.imageUrl === 'string' ? current.imageUrl : undefined,
      });
      const nextBody = pmToFallbackText(doc, {
        title: typeof current.title === 'string' ? current.title : undefined,
        subtitle: typeof current.subtitle === 'string' ? current.subtitle : undefined,
      });

      setValue('card', nextCard, { shouldDirty: true, shouldValidate: false });
      setValue('body', nextBody, { shouldDirty: true, shouldValidate: false });
    },
    [readLatestCard, setValue]
  );

  const updateHeader = useCallback(
    (patch: Partial<CardHeader>) => {
      const current = readLatestCard();
      const nextHeader: CardHeader = {
        title: typeof current.title === 'string' ? current.title : undefined,
        subtitle: typeof current.subtitle === 'string' ? current.subtitle : undefined,
        imageUrl: typeof current.imageUrl === 'string' ? current.imageUrl : undefined,
        ...patch,
      };

      const nextCard: CardElementLikeJson = {
        type: 'card',
        ...(nextHeader.title && { title: nextHeader.title }),
        ...(nextHeader.subtitle && { subtitle: nextHeader.subtitle }),
        ...(nextHeader.imageUrl && { imageUrl: nextHeader.imageUrl }),
        children: Array.isArray(current.children) ? current.children : [],
      };

      const currentBody = getValues('body') ?? '';
      const bodyLines = typeof currentBody === 'string' ? currentBody.split('\n') : [];
      const headerLines: string[] = [];
      if (nextHeader.title) headerLines.push(nextHeader.title);
      if (nextHeader.subtitle) headerLines.push(nextHeader.subtitle);

      const prevHeaderLineCount = (current.title ? 1 : 0) + (current.subtitle ? 1 : 0);
      const bodyOnly = bodyLines.slice(prevHeaderLineCount);
      const nextBody = [...headerLines, ...bodyOnly].filter((l) => l.length > 0).join('\n');

      setValue('card', nextCard, { shouldDirty: true, shouldValidate: false });
      setValue('body', nextBody, { shouldDirty: true, shouldValidate: false });
    },
    [getValues, readLatestCard, setValue]
  );

  return {
    initialEditorContent,
    onEditorUpdate,
    header,
    updateHeader,
  };
}
