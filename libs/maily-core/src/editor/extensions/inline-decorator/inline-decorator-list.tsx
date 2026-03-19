import { ReactRenderer } from '@tiptap/react';
import { SuggestionOptions } from '@tiptap/suggestion';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import tippy, { GetReferenceClientRect } from 'tippy.js';
import { useInlineDecoratorOptions } from '@/editor/utils/node-options';
import { VariableSuggestionsPopoverRef } from '../../nodes/variable/variable-suggestions-popover';
import { InlineDecoratorItem } from './inline-decorator';

export type InlineDecoratorListProps = {
  command: (params: InlineDecoratorItem) => void;
  items: InlineDecoratorItem[];
} & SuggestionOptions;

/**
 * Transforms InlineDecoratorItem array to Variable format for the popover component
 */
function transformItemsForPopover(items: InlineDecoratorItem[]) {
  return items.map((item) => ({
    name: item.name,
    required: true,
    valid: true,
  }));
}

/**
 * Handles keyboard navigation for the suggestion list
 */
function createKeyboardHandler(popoverRef: React.RefObject<VariableSuggestionsPopoverRef | null>) {
  return ({ event }: { event: KeyboardEvent }) => {
    if (!popoverRef.current) {
      return false;
    }

    const { moveUp, moveDown, select } = popoverRef.current;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        moveUp();
        return true;
      case 'ArrowDown':
        event.preventDefault();
        moveDown();
        return true;
      case 'Enter':
        select();
        return true;
      default:
        return false;
    }
  };
}

/**
 * Handles item selection from the popover
 */
function createItemSelectHandler(items: InlineDecoratorItem[], command: (params: InlineDecoratorItem) => void) {
  return (value: { name: string }) => {
    const originalItem = items.find((item) => item.name === value.name);
    if (originalItem) {
      command(originalItem);
    }
  };
}

/**
 * InlineDecoratorList - Renders a suggestion list for inline decorators
 *
 * This component reuses the existing VariableSuggestionsPopover UI component
 * but adapts it for inline decorator suggestions by transforming the data format.
 */
export const InlineDecoratorList = forwardRef<any, InlineDecoratorListProps>((props, ref) => {
  const { items = [], editor, command } = props;

  const popoverRef = useRef<VariableSuggestionsPopoverRef | null>(null);
  const VariableSuggestionPopoverComponent = useInlineDecoratorOptions(editor)?.variableSuggestionsPopover;

  // Transform items for the popover component
  const transformedItems = useMemo(() => transformItemsForPopover(items), [items]);

  // Create handlers
  const handleKeyDown = useMemo(() => createKeyboardHandler(popoverRef), []);
  const handleItemSelect = useMemo(() => createItemSelectHandler(items, command), [items, command]);

  // Expose keyboard navigation methods to parent
  useImperativeHandle(ref, () => ({
    onKeyDown: handleKeyDown,
  }));

  if (!VariableSuggestionPopoverComponent) {
    return null;
  }

  return (
    <VariableSuggestionPopoverComponent items={transformedItems} onSelectItem={handleItemSelect} ref={popoverRef} />
  );
});

InlineDecoratorList.displayName = 'InlineDecoratorList';

/**
 * Filters items based on query string
 */
function filterItems(items: InlineDecoratorItem[], query: string): InlineDecoratorItem[] {
  if (!query) {
    return items;
  }

  const queryLower = query.toLowerCase();
  return items.filter((item) => item.name.toLowerCase().includes(queryLower));
}

/**
 * Gets items for suggestions - handles both static arrays and dynamic functions
 */
function getItemsForSuggestion(
  items: InlineDecoratorItem[] | ((query: string) => InlineDecoratorItem[]),
  query: string
): InlineDecoratorItem[] {
  if (typeof items === 'function') {
    return items(query);
  }
  return filterItems(items, query);
}

/**
 * Gets the extension options from the editor
 */
function getExtensionOptions(editor: any) {
  return editor.extensionManager.extensions.find((ext: any) => ext.name === 'inlineDecorator');
}

/**
 * Formats the selected item into text to insert
 */
function formatSelectedItem(props: any, editor: any): string {
  const extension = getExtensionOptions(editor);

  if (extension?.options?.formatPattern) {
    return `${extension.options.formatPattern(props.name)} `;
  }

  // Fallback to hardcoded pattern if extension not found
  return `{{${props.name}}} `;
}

/**
 * Creates the suggestion command handler
 */
function createSuggestionCommand() {
  return ({ editor, range, props }: any) => {
    const text = formatSelectedItem(props, editor);
    editor.chain().focus().insertContentAt(range, text).run();
  };
}

/**
 * Creates the allow handler for suggestions
 */
function createAllowHandler() {
  return ({ state, range }: any) => {
    const $from = state.doc.resolve(range.from);
    const type = state.schema.nodes.text;
    return !!$from.parent.type.contentMatch.matchType(type);
  };
}

/**
 * Creates a reference client rect getter with fallback to decoration node's sibling
 */
function createGetReferenceClientRect(props: any): GetReferenceClientRect {
  return () => {
    const originalRect = props.clientRect();
    if (originalRect.width === 0 && originalRect.height === 0) {
      const previousSibling = props.decorationNode?.parentElement?.previousElementSibling;
      if (previousSibling) {
        return previousSibling.getBoundingClientRect();
      }
    }
    return originalRect;
  };
}

/**
 * Creates and manages the tippy popup instance
 */
function createTippyPopupManager() {
  let component: ReactRenderer<any>;
  let popup: InstanceType<any> | null = null;

  return {
    onStart: (props: any) => {
      component = new ReactRenderer(InlineDecoratorList, {
        props,
        editor: props.editor,
      });

      if (!props.clientRect) {
        return;
      }

      popup = tippy('body', {
        getReferenceClientRect: createGetReferenceClientRect(props),
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
      });
    },

    onUpdate: (props: any) => {
      component.updateProps(props);

      if (!props.clientRect) {
        return;
      }

      popup?.[0]?.setProps({
        getReferenceClientRect: createGetReferenceClientRect(props),
      });
    },

    onKeyDown: (props: any) => {
      if (props.event.key === 'Escape') {
        popup?.[0].hide();
        return true;
      }

      return component.ref?.onKeyDown(props);
    },

    onExit: () => {
      if (!popup || !popup?.[0] || !component) {
        return;
      }

      popup?.[0].destroy();
      component.destroy();
    },
  };
}

/**
 * Creates a complete suggestion configuration for inline decorators
 *
 * @param char - The trigger character (e.g., '{{t.')
 * @param items - Static array or dynamic function that returns decorator items
 * @param pluginKey - Optional plugin key for the suggestion
 * @returns Complete suggestion options configuration
 */
export function getInlineDecoratorSuggestionsReact(
  char: string = '{{t.',
  items: InlineDecoratorItem[] | ((query: string) => InlineDecoratorItem[]) = [],
  pluginKey?: any
): Omit<SuggestionOptions, 'editor'> {
  return {
    char,
    pluginKey,

    // Dynamic item resolution
    items: ({ query }) => getItemsForSuggestion(items, query),

    // Popup rendering and lifecycle management
    render: createTippyPopupManager,

    // Command execution when item is selected
    command: createSuggestionCommand(),

    // Validation for where suggestions can appear
    allow: createAllowHandler(),
  };
}
