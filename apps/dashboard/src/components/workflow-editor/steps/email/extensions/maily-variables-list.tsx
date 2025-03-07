import { Variable } from '@maily-to/core/extensions';
import React, { useImperativeHandle, useMemo, useRef } from 'react';

import { VariableList, VariableListRef } from '@/components/variable/variable-list';

type VariableSuggestionsPopoverProps = {
  items: Variable[];
  onSelectItem: (item: Variable) => void;
};

type VariableSuggestionsPopoverRef = {
  moveUp: () => void;
  moveDown: () => void;
  select: () => void;
};

export const MailyVariablesList = React.forwardRef(
  ({ items, onSelectItem }: VariableSuggestionsPopoverProps, ref: React.Ref<VariableSuggestionsPopoverRef>) => {
    const options = useMemo(() => items.map((item) => ({ label: item.name, value: item.name })), [items]);
    const variablesListRef = useRef<VariableListRef>(null);

    const onSelect = (value: string) => {
      const item = items.find((item) => item.name === value);

      if (!item) {
        return;
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
