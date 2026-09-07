import { ReactRenderer } from '@tiptap/react';
import { SuggestionOptions } from '@tiptap/suggestion';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import tippy, { GetReferenceClientRect } from 'tippy.js';
import { getVariableOptions, useVariableOptions } from '@/editor/utils/node-options';
import { processVariables } from '@/editor/utils/variable';
import { DEFAULT_VARIABLE_TRIGGER_CHAR, Variable as VariableType } from './variable';
import { VariableSuggestionsPopoverRef } from './variable-suggestions-popover';

export type VariableListProps = {
  command: (params: { id: string; required: boolean }) => void;
  items: VariableType[];
} & SuggestionOptions;

export const VariableList = forwardRef((props: VariableListProps, ref) => {
  const { items = [], editor } = props;

  const popoverRef = useRef<VariableSuggestionsPopoverRef>(null);
  const variableOptions = useVariableOptions(editor);
  const VariableSuggestionPopoverComponent = variableOptions?.variableSuggestionsPopover;

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (!popoverRef.current) {
        return false;
      }

      const { moveUp, moveDown, select } = popoverRef.current || {};
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveUp();
        return true;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveDown();
        return true;
      }

      if (event.key === 'Enter') {
        select();
        return true;
      }

      return false;
    },
  }));

  if (!VariableSuggestionPopoverComponent) {
    return null;
  }

  return (
    <VariableSuggestionPopoverComponent
      items={items}
      onSelectItem={(value: any) => {
        props.command({
          id: value.name,
          required: value.required ?? true,
        });
      }}
      ref={popoverRef}
    />
  );
});

VariableList.displayName = 'VariableList';

export function getVariableSuggestions(
  char: string = DEFAULT_VARIABLE_TRIGGER_CHAR
): Omit<SuggestionOptions, 'editor'> {
  return {
    char,
    items: ({ query, editor }) => {
      const variableOptions = getVariableOptions(editor);
      const variables = variableOptions?.variables;

      return processVariables(variables || [], {
        query,
        editor,
        from: 'content-variable',
      });
    },

    render: () => {
      let component: ReactRenderer<any>;
      let popup: InstanceType<any> | null = null;

      return {
        onStart: (props) => {
          component = new ReactRenderer(VariableList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as GetReferenceClientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },

        onUpdate(props) {
          component.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as GetReferenceClientRect,
          });
        },

        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            popup?.[0].hide();
            return true;
          }

          return component.ref?.onKeyDown(props);
        },

        onExit() {
          if (!popup || !popup?.[0] || !component) {
            return;
          }

          popup?.[0].destroy();
          component.destroy();
        },
      };
    },
  };
}
