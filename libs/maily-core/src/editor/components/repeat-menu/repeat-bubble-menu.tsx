/** biome-ignore-all lint/correctness/useHookAtTopLevel: needs to be fixed */
import { BubbleMenu, findChildren, Editor as TiptapEditor } from '@tiptap/react';
import { InfoIcon, Repeat2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { sticky } from 'tippy.js';
import { cn } from '@/editor/utils/classname';
import { getClosestNodeByName } from '@/editor/utils/columns';
import { isTextSelected } from '@/editor/utils/is-text-selected';
import { useVariableOptions } from '@/editor/utils/node-options';
import { processVariables } from '@/editor/utils/variable';
import { getRenderContainer } from '../../utils/get-render-container';
import { ShowPopover } from '../show-popover';
import { EditorBubbleMenuProps } from '../text-menu/text-bubble-menu';
import { Divider } from '../ui/divider';
import { InputAutocomplete } from '../ui/input-autocomplete';
import { NumberInput } from '../ui/number-input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useRepeatState } from './use-repeat-state';

export function RepeatBubbleMenu(
  props: EditorBubbleMenuProps & {
    config?: { description?: (editor: TiptapEditor) => React.ReactNode };
  }
) {
  const { appendTo, editor, config } = props;
  if (!editor) {
    return null;
  }

  const state = useRepeatState(editor);

  const getReferenceClientRect = useCallback(() => {
    const renderContainer = getRenderContainer(editor!, 'repeat');
    const rect = renderContainer?.getBoundingClientRect() || new DOMRect(-1000, -1000, 0, 0);

    return rect;
  }, [editor]);

  const bubbleMenuProps: EditorBubbleMenuProps = {
    ...props,
    ...(appendTo ? { appendTo: appendTo.current } : {}),
    shouldShow: ({ editor }) => {
      if (editor.view.dragging) {
        return false;
      }

      const activeForNode = getClosestNodeByName(editor, 'repeat');
      const sectionNodeChildren = activeForNode
        ? findChildren(activeForNode?.node, (node) => {
            return node.type.name === 'section';
          })?.[0]
        : null;
      const hasActiveSectionNodeChildren = sectionNodeChildren && editor.isActive('section');

      if (isTextSelected(editor) || hasActiveSectionNodeChildren || !editor.isEditable) {
        return false;
      }

      return editor.isActive('repeat');
    },
    tippyOptions: {
      offset: [0, 8],
      popperOptions: {
        modifiers: [{ name: 'flip', enabled: false }],
      },
      getReferenceClientRect,
      appendTo: () => appendTo?.current,
      plugins: [sticky],
      sticky: 'popper',
      maxWidth: 'auto',
    },
    pluginKey: 'repeatBubbleMenu',
  };

  const opts = useVariableOptions(editor);
  const variables = opts?.variables;
  const renderVariable = opts?.renderVariable;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUpdatingKey, setIsUpdatingKey] = useState(false);

  const eachKey = state?.each || '';
  const autoCompleteOptions = useMemo(() => {
    return processVariables(variables, {
      query: eachKey || '',
      editor,
      from: 'repeat-variable',
    }).map((variable) => variable.name);
  }, [variables, eachKey, editor]);

  const isValidEachKey = eachKey;

  return (
    <BubbleMenu
      {...bubbleMenuProps}
      className="mly-rounded-lg mly-border mly-border-gray-200 mly-bg-white mly-p-0.5 mly-shadow-md"
    >
      <TooltipProvider>
        <div className="mly-flex mly-items-stretch">
          <div className="mly-flex mly-items-center mly-gap-1.5 mly-px-1.5 mly-text-sm mly-leading-none">
            Repeat for
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon className={cn('mly-size-3 mly-stroke-[2.5] mly-text-gray-400')} />
              </TooltipTrigger>
              <TooltipContent sideOffset={14} className="mly-max-w-[260px]" align="start">
                Loops through each item in the selected iterable variable.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="mly-flex mly-items-center mly-gap-1.5 mly-px-1.5 mly-text-sm">
            {!isUpdatingKey && (
              <button
                onClick={() => {
                  setIsUpdatingKey(true);
                  setTimeout(() => {
                    inputRef.current?.focus();
                  }, 0);
                }}
                className="mly-flex mly-items-center"
              >
                {renderVariable({
                  variable: {
                    name: state?.each,
                    valid: isValidEachKey,
                  },
                  fallback: '',
                  from: 'bubble-variable',
                  editor,
                })}
              </button>
            )}
            {isUpdatingKey && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsUpdatingKey(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsUpdatingKey(false);
                  }
                }}
              >
                <InputAutocomplete
                  className="mly-flex mly-h-5 mly-items-center"
                  editor={editor}
                  placeholder="ie. payload.items"
                  value={state?.each || ''}
                  onValueChange={(value) => {
                    editor.commands.updateRepeatAttributes({
                      each: value,
                    });
                  }}
                  onOutsideClick={() => {
                    setIsUpdatingKey(false);
                  }}
                  onSelectOption={(value) => {
                    editor.commands.updateRepeatAttributes({
                      each: value,
                    });
                    setIsUpdatingKey(false);
                  }}
                  autoCompleteOptions={autoCompleteOptions}
                  ref={inputRef}
                />
              </form>
            )}
          </div>

          <Divider className="mly-bg-gray-100" />
          <div className="mly-flex mly-items-center mly-gap-1.5 mly-px-1.5">
            <NumberInput
              value={state.iterations}
              onValueChange={(value) => {
                editor.commands.updateRepeatAttributes({
                  iterations: value,
                });
              }}
              icon={Repeat2}
              tooltip="Limit the number of items shown (0 or empty shows all items)"
              max={99}
            />
          </div>
          <Divider className="mly-bg-gray-100" />
          <ShowPopover
            showIfKey={state.currentShowIfKey}
            onShowIfKeyValueChange={(value) => {
              editor.commands.updateRepeatAttributes({
                showIfKey: value,
              });
            }}
            editor={editor}
          />
        </div>
        {config?.description && config.description(editor)}
      </TooltipProvider>
    </BubbleMenu>
  );
}
