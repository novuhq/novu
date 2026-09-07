import { getInlineDecoratorSuggestionsReact, InlineDecoratorExtension } from '@novu/maily-core/extensions';
import {
  TRANSLATION_DEFAULT_TEMPLATE,
  TRANSLATION_DELIMITER_CLOSE,
  TRANSLATION_DELIMITER_OPEN,
  TRANSLATION_KEY_SINGLE_REGEX,
  TRANSLATION_TRIGGER_CHARACTER,
} from '@novu/shared';
import { forwardRef, useMemo } from 'react';
import { useDataRef } from '@/hooks/use-data-ref';
import { LocalizationResourceEnum, TranslationKey } from '@/types/translations';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import type { TranslationValueInputComponent } from './edit-translation-popover/edit-translation-popover';
import { TranslationPill } from './translation-pill';
import { TranslationKeyItem, TranslationSuggestionsListView } from './translation-suggestions-list-view';

const translationPillHoc = ({
  resourceId,
  resourceType,
  variables,
  isAllowedVariable,
  translationValueInput,
}: {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  translationValueInput: TranslationValueInputComponent;
}) => {
  return function TranslationPillHoc(props: {
    decoratorKey: string; // "common.submit"
    onUpdate?: (key: string) => void;
    onDelete?: () => void;
  }) {
    return (
      <TranslationPill
        {...props}
        resourceId={resourceId}
        resourceType={resourceType}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        translationValueInput={translationValueInput}
      />
    );
  };
};

export const useCreateTranslationExtension = (props: {
  isTranslationEnabled: boolean;
  translationKeys?: TranslationKey[];
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  onCreateNewTranslationKey?: (translationKey: string) => Promise<void>;
  variables: LiquidVariable[];
  isAllowedVariable: IsAllowedVariable;
  translationValueInput: TranslationValueInputComponent;
}) => {
  const propsRef = useDataRef(props);

  return useMemo(
    () =>
      InlineDecoratorExtension.configure({
        triggerPattern: TRANSLATION_TRIGGER_CHARACTER,
        closingPattern: TRANSLATION_DELIMITER_CLOSE,
        openingPattern: TRANSLATION_DELIMITER_OPEN,
        extractKey: (text: string) => {
          const match = text.match(TRANSLATION_KEY_SINGLE_REGEX);
          return match ? match[1] : null;
        },
        formatPattern: (key: string) => TRANSLATION_DEFAULT_TEMPLATE(key),
        isPatternMatch: (value: string) => {
          return value.startsWith(TRANSLATION_DELIMITER_OPEN) && value.endsWith(TRANSLATION_DELIMITER_CLOSE);
        },
        decoratorComponent: translationPillHoc({
          resourceId: propsRef.current.resourceId,
          resourceType: propsRef.current.resourceType,
          variables: propsRef.current.variables,
          isAllowedVariable: propsRef.current.isAllowedVariable,
          translationValueInput: propsRef.current.translationValueInput,
        }),
        suggestion: {
          ...getInlineDecoratorSuggestionsReact(TRANSLATION_TRIGGER_CHARACTER, propsRef.current.translationKeys),
          allowToIncludeChar: true,
          decorationTag: 'span',
          allowedPrefixes: null,
          items: ({ query }) => {
            const clearedQuery = query.replace('}}', '').trim();
            const { translationKeys } = propsRef.current;
            const existingKeys = translationKeys?.map((key) => key.name) || [];
            const filteredKeys =
              translationKeys?.filter((key) => key.name.toLowerCase().includes(clearedQuery.toLowerCase())) || [];

            // If query doesn't match any existing keys and is not empty, offer to create new key
            const shouldOfferNewKey =
              clearedQuery.trim() && !existingKeys.some((key) => key.toLowerCase() === clearedQuery.toLowerCase());

            const items: TranslationKeyItem[] = filteredKeys.map((key) => ({
              name: key.name,
              id: key.name,
            }));

            if (shouldOfferNewKey) {
              items.push({
                name: clearedQuery.trim(),
                id: clearedQuery.trim(),
              });
            }

            return items;
          },
          command: ({ editor, range, props }) => {
            /**
             * This is called when you select/create a translation key from the suggestion
             * list in the editor (not in the bubble menu). It calls the onSelectItem
             * callback with the selected item.
             */
            const query = `${TRANSLATION_DEFAULT_TEMPLATE(props.id)} `; // Added space after the closing brace

            // Insert the translation key
            editor.chain().focus().insertContentAt(range, query).run();
          },
        },
        variableSuggestionsPopover: forwardRef((props: any, ref: any) => {
          const { isTranslationEnabled, translationKeys, resourceId, resourceType, onCreateNewTranslationKey } =
            propsRef.current;
          return (
            <TranslationSuggestionsListView
              {...props}
              ref={ref}
              isTranslationEnabled={isTranslationEnabled}
              translationKeys={translationKeys}
              resourceId={resourceId}
              resourceType={resourceType}
              onSelectItem={(item) => {
                /*
                 * This is called when you select/create a translation key from the suggestion
                 * list. It's called in both editor and bubble menu contexts.
                 */

                // Check if this is a new translation key that doesn't exist
                const existingKeys = translationKeys?.map((key) => key.name) || [];
                const isNewTranslationKey = !existingKeys.includes(item.name);

                if (isNewTranslationKey && onCreateNewTranslationKey) {
                  onCreateNewTranslationKey(item.name);
                }

                props.onSelectItem(item);
              }}
            />
          );
        }),
      }),
    [propsRef]
  );
};
