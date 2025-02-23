import React, { useMemo, useImperativeHandle, useRef } from 'react';
import { VariableListProps } from '@maily-to/core/extensions';

import { VariableList, VariableListRef } from '@/components/variable/variable-list';

export const MailyVariablesList = React.forwardRef(({ items, command }: VariableListProps, ref) => {
  const options = useMemo(() => items.map((item) => ({ label: item.name, value: item.name })), [items]);
  const variablesListRef = useRef<VariableListRef>(null);

  const onSelect = (value: string) => {
    const item = items.find((item) => item.name === value);

    if (!item) {
      return;
    }

    command({
      id: item.name,
      required: item.required ?? true,
    });
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        variablesListRef.current?.prev();
        return true;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        variablesListRef.current?.next();
        return true;
      }

      if (event.key === 'Enter') {
        variablesListRef.current?.select();
        return true;
      }

      return false;
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
});
