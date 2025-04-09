import { Variable } from '@maily-to/core/extensions';
import React, { useImperativeHandle, useMemo, useRef } from 'react';
import { VariableList, VariableListRef } from '@/components/variable/variable-list';
import { DIGEST_PREVIEW_MAP, DIGEST_VARIABLES_VALUE_MAP } from '@/components/variable/utils/digest-variables';

type VariableSuggestionsPopoverProps = {
  items: Variable[];
  onSelectItem: (item: Variable) => void;
};

type VariableSuggestionsPopoverRef = {
  moveUp: () => void;
  moveDown: () => void;
  select: () => void;
};

export const MailyVariablesListView = React.forwardRef(
  ({ items, onSelectItem }: VariableSuggestionsPopoverProps, ref: React.Ref<VariableSuggestionsPopoverRef>) => {
    const options = useMemo(
      () =>
        items.map((item) => ({
          label: item.name,
          value: item.name,
          preview:
            item.name in DIGEST_PREVIEW_MAP
              ? DIGEST_PREVIEW_MAP[item.name as keyof typeof DIGEST_PREVIEW_MAP]
              : undefined,
        })),
      [items]
    );
    const variablesListRef = useRef<VariableListRef>(null);

    const onSelect = (value: string) => {
      const item = items.find((item) => item.name === value);

      if (!item) {
        return;
      }

      /**
       *  If the variable is a digest variable,
       * we need to change the name to the value of the variable.
       */
      if (item.name in DIGEST_VARIABLES_VALUE_MAP) {
        const digestValue = DIGEST_VARIABLES_VALUE_MAP[item.name as keyof typeof DIGEST_VARIABLES_VALUE_MAP];
        item.name = digestValue;
      }

      onSelectItem(item);
    };

    useImperativeHandle(ref, () => ({
      moveUp: () => {
        variablesListRef.current?.prev();
      },
      moveDown: () => {
        variablesListRef.current?.next();
      },
      select: () => {
        variablesListRef.current?.select();
      },
    }));

    if (items.length === 0) {
      return null;
    }

    return (
      <VariableList
        ref={variablesListRef}
        className="rounded-md border shadow-md outline-none"
        options={options}
        onSelect={onSelect}
        title="Variables"
      />
    );
  }
);
