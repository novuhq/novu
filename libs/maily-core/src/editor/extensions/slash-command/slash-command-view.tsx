/** biome-ignore-all lint/correctness/useUniqueElementIds: needs to be fixed */
import { Editor, Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import { SuggestionOptions } from '@tiptap/suggestion';
import { ArrowDown, ArrowUp, CornerDownLeft } from 'lucide-react';
import {
  Fragment,
  forwardRef,
  KeyboardEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import tippy, { GetReferenceClientRect, Instance } from 'tippy.js';
import { BlockGroupItem, BlockItem } from '@/blocks/types';
import { TooltipProvider } from '@/editor/components/ui/tooltip';
import { cn } from '@/editor/utils/classname';
import { DEFAULT_SLASH_COMMANDS } from './default-slash-commands';
import { SlashCommandItem } from './slash-command-item';
import { searchSlashCommands } from './slash-command-search';

type CommandListProps = {
  items: BlockGroupItem[];
  command: (item: BlockItem) => void;
  editor: Editor;
  range: Range;
  query: string;
};

const CommandList = forwardRef(function CommandList(props: CommandListProps, ref) {
  const { items: groups, command, editor, range, query } = props;

  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [hoveredItemKey, setHoveredItemKey] = useState<string | null>(null);

  const prevQuery = useRef('');
  const prevSelectedGroupIndex = useRef(0);
  const prevSelectedCommandIndex = useRef(0);

  const selectItem = useCallback(
    (groupIndex: number, commandIndex: number) => {
      const item = groups[groupIndex].commands[commandIndex];
      if (!item) {
        return;
      }

      command(item);
    },
    [command]
  );

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      const navigationKeys = ['ArrowUp', 'ArrowDown', 'Enter', 'ArrowLeft', 'ArrowRight'];
      if (navigationKeys.includes(event.key)) {
        let newCommandIndex = selectedCommandIndex;
        let newGroupIndex = selectedGroupIndex;

        switch (event.key) {
          case 'ArrowLeft': {
            event.preventDefault();

            const group = groups?.[selectedGroupIndex];
            const isInsideSubCommand = group && 'id' in group;
            if (!isInsideSubCommand) {
              return false;
            }

            editor.chain().focus().insertContentAt(range, `/${prevQuery.current}`).run();
            setTimeout(() => {
              setSelectedGroupIndex(prevSelectedGroupIndex.current);
              setSelectedCommandIndex(prevSelectedCommandIndex.current);
            }, 0);
            return true;
          }
          case 'ArrowRight': {
            event.preventDefault();

            const command = groups?.[selectedGroupIndex]?.commands?.[selectedCommandIndex];
            const isSelectingSubCommand = command && 'commands' in command;
            if (!isSelectingSubCommand) {
              return false;
            }

            selectItem(selectedGroupIndex, selectedCommandIndex);
            prevQuery.current = query;
            prevSelectedGroupIndex.current = selectedGroupIndex;
            prevSelectedCommandIndex.current = selectedCommandIndex;
            return true;
          }
          case 'Enter':
            if (!groups.length) {
              return false;
            }
            selectItem(selectedGroupIndex, selectedCommandIndex);

            prevQuery.current = query;
            prevSelectedGroupIndex.current = selectedGroupIndex;
            prevSelectedCommandIndex.current = selectedCommandIndex;
            return true;
          case 'ArrowUp':
            if (!groups.length) {
              return false;
            }
            newCommandIndex = selectedCommandIndex - 1;
            newGroupIndex = selectedGroupIndex;
            if (newCommandIndex < 0) {
              newGroupIndex = selectedGroupIndex - 1;
              newCommandIndex = groups[newGroupIndex]?.commands.length - 1 || 0;
            }
            if (newGroupIndex < 0) {
              newGroupIndex = groups.length - 1;
              newCommandIndex = groups[newGroupIndex]?.commands.length - 1 || 0;
            }
            setSelectedGroupIndex(newGroupIndex);
            setSelectedCommandIndex(newCommandIndex);
            return true;
          case 'ArrowDown': {
            if (!groups.length) {
              return false;
            }
            const commands = groups[selectedGroupIndex].commands;
            newCommandIndex = selectedCommandIndex + 1;
            newGroupIndex = selectedGroupIndex;
            if (commands.length - 1 < newCommandIndex) {
              newCommandIndex = 0;
              newGroupIndex = selectedGroupIndex + 1;
            }
            if (groups.length - 1 < newGroupIndex) {
              newGroupIndex = 0;
            }
            setSelectedGroupIndex(newGroupIndex);
            setSelectedCommandIndex(newCommandIndex);
            return true;
          }
          default:
            return false;
        }
      }
    },
  }));

  const commandListContainer = useRef<HTMLDivElement | null>(null);
  const activeCommandRef = useRef<HTMLButtonElement | null>(null);

  useLayoutEffect(() => {
    const container = commandListContainer?.current;
    const activeCommandContainer = activeCommandRef?.current;
    if (!container || !activeCommandContainer) {
      return;
    }

    const { offsetTop, offsetHeight } = activeCommandContainer;
    container.style.transition = 'none';
    container.scrollTop = offsetTop - offsetHeight;
  }, [selectedGroupIndex, selectedCommandIndex, commandListContainer, activeCommandRef]);

  useEffect(() => {
    setSelectedGroupIndex(0);
    setSelectedCommandIndex(0);
  }, [groups]);

  useEffect(() => {
    return () => {
      prevQuery.current = '';
      prevSelectedGroupIndex.current = 0;
      prevSelectedCommandIndex.current = 0;
    };
  }, []);

  return groups.length > 0 ? (
    <TooltipProvider>
      <div className="mly-z-50 mly-w-72 mly-overflow-hidden mly-rounded-md mly-border mly-border-gray-200 mly-bg-white mly-shadow-md mly-transition-all">
        <div
          id="slash-command"
          ref={commandListContainer}
          className="mly-no-scrollbar mly-h-auto mly-max-h-[330px] mly-overflow-y-auto"
        >
          {groups.map((group, groupIndex) => (
            <Fragment key={groupIndex}>
              <span
                className={cn(
                  'mly-flex mly-items-center mly-justify-between mly-self-stretch mly-border mly-border-[#F2F5F8] mly-bg-[#FBFBFB] mly-p-1.5 mly-text-xs mly-uppercase mly-text-gray-400',
                  groupIndex > 0 ? 'mly-border-t' : ''
                )}
              >
                {group.title}
                <div className="mly-pointer-events-none mly-flex mly-h-5 mly-w-5 mly-items-center mly-justify-center mly-rounded-[6px] mly-border mly-border-gray-200 mly-bg-white mly-shadow-[0px_0px_0px_1px_rgba(14,18,27,0.02)_inset,_0px_1px_4px_0px_rgba(14,18,27,0.12)]">
                  <span className="mly-text-sm mly-text-gray-400">/</span>
                </div>
              </span>
              <div className="mly-space-y-0.5 mly-p-1">
                {group.commands.map((item, commandIndex) => {
                  const itemKey = `${groupIndex}-${commandIndex}`;
                  return (
                    <SlashCommandItem
                      key={itemKey}
                      item={item}
                      groupIndex={groupIndex}
                      commandIndex={commandIndex}
                      selectedGroupIndex={selectedGroupIndex}
                      selectedCommandIndex={selectedCommandIndex}
                      selectItem={() => selectItem(groupIndex, commandIndex)}
                      editor={editor}
                      activeCommandRef={activeCommandRef}
                      hoveredItemKey={hoveredItemKey}
                      onHover={(isHovered) => setHoveredItemKey(isHovered ? itemKey : null)}
                    />
                  );
                })}
              </div>
            </Fragment>
          ))}
        </div>
        <div className="mly-flex mly-justify-between mly-rounded-b-md mly-border-t mly-border-gray-100 mly-bg-white mly-p-1.5">
          <div className="mly-flex mly-items-center mly-gap-0.5">
            <div className="mly-pointer-events-none mly-flex mly-h-5 mly-w-5 mly-items-center mly-justify-center mly-rounded-[6px] mly-border mly-border-gray-200 mly-bg-white mly-shadow-[0px_0px_0px_1px_rgba(14,18,27,0.02)_inset,_0px_1px_4px_0px_rgba(14,18,27,0.12)]">
              <ArrowUp className="mly-h-3 mly-w-3 mly-text-gray-400" />
            </div>
            <div className="mly-pointer-events-none mly-flex mly-h-5 mly-w-5 mly-items-center mly-justify-center mly-rounded-[6px] mly-border mly-border-gray-200 mly-bg-white mly-shadow-[0px_0px_0px_1px_rgba(14,18,27,0.02)_inset,_0px_1px_4px_0px_rgba(14,18,27,0.12)]">
              <ArrowDown className="mly-h-3 mly-w-3 mly-text-gray-400" />
            </div>
            <span className="mly-ml-1.5 mly-text-xs mly-font-normal mly-text-gray-500">Navigate</span>
          </div>
          <div className="mly-pointer-events-none mly-flex mly-h-5 mly-w-5 mly-items-center mly-justify-center mly-rounded-[6px] mly-border mly-border-gray-200 mly-bg-white mly-shadow-[0px_0px_0px_1px_rgba(14,18,27,0.02)_inset,_0px_1px_4px_0px_rgba(14,18,27,0.12)]">
            <CornerDownLeft className="mly-h-3 mly-w-3 mly-text-gray-400" />
          </div>
        </div>
      </div>
    </TooltipProvider>
  ) : null;
});

export function getSlashCommandSuggestions(
  groups: BlockGroupItem[] = DEFAULT_SLASH_COMMANDS
): Omit<SuggestionOptions, 'editor'> {
  return {
    items: ({ query, editor }) => {
      return searchSlashCommands(query, editor, groups);
    },
    allow: ({ editor }) => {
      const isInsideHTMLCodeBlock = editor.isActive('htmlCodeBlock');
      if (isInsideHTMLCodeBlock) {
        return false;
      }

      return true;
    },
    render: () => {
      let component: ReactRenderer<any>;
      let popup: Instance<any>[] | null = null;

      return {
        onStart: (props) => {
          component = new ReactRenderer(CommandList, {
            props,
            editor: props.editor,
          });

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as GetReferenceClientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'top-start',
          });
        },
        onUpdate: (props) => {
          const currentPopup = popup?.[0];
          if (!currentPopup || currentPopup?.state?.isDestroyed) {
            return;
          }

          component?.updateProps(props);
          currentPopup.setProps({
            getReferenceClientRect: props.clientRect,
          });
        },
        onKeyDown: (props) => {
          if (props.event.key === 'Escape') {
            const currentPopup = popup?.[0];
            if (!currentPopup?.state?.isDestroyed) {
              currentPopup?.destroy();
            }

            component?.destroy();
            return true;
          }

          return component?.ref?.onKeyDown(props);
        },
        onExit: () => {
          if (!popup || !popup?.[0] || !component) {
            return;
          }

          const currentPopup = popup?.[0];
          if (!currentPopup.state.isDestroyed) {
            currentPopup.destroy();
          }

          component?.destroy();
        },
      };
    },
  };
}
