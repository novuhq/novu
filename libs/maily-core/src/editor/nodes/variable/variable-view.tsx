import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { AlertTriangle, Braces, Pencil } from 'lucide-react';
import { useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/editor/components/popover';
import { Divider } from '@/editor/components/ui/divider';
import { TooltipProvider } from '@/editor/components/ui/tooltip';
import { cn } from '@/editor/utils/classname';
import { AUTOCOMPLETE_PASSWORD_MANAGERS_OFF } from '@/editor/utils/constants';
import { getNodeOptions } from '@/editor/utils/node-options';
import { DEFAULT_RENDER_VARIABLE_FUNCTION, type RenderVariableFunction, VariableOptions } from './variable';

export function VariableView(props: NodeViewProps) {
  const { node, updateAttributes, editor } = props;
  const { id, fallback, required } = node.attrs;

  const renderVariable = useMemo(() => {
    const variableRender =
      getNodeOptions<VariableOptions>(editor, 'variable')?.renderVariable ?? DEFAULT_RENDER_VARIABLE_FUNCTION;

    return variableRender;
  }, [editor]);

  return (
    <NodeViewWrapper className="react-component mly-inline-block mly-leading-none" draggable="false">
      <Popover
        onOpenChange={(open) => {
          editor.storage.variable.popover = open;
        }}
      >
        <PopoverTrigger>
          {renderVariable({
            variable: { name: id, required: required, valid: true },
            fallback,
            editor,
            from: 'content-variable',
          })}
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          className="mly-w-max mly-rounded-lg !mly-p-0.5"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <TooltipProvider>
            <div className="mly-flex mly-items-stretch mly-text-midnight-gray">
              <label className="mly-relative">
                <span className="mly-inline-block mly-px-2 mly-text-xs mly-text-midnight-gray">Variable</span>
                <input
                  {...AUTOCOMPLETE_PASSWORD_MANAGERS_OFF}
                  value={id ?? ''}
                  onChange={(e) => {
                    updateAttributes({
                      id: e.target.value,
                    });
                  }}
                  placeholder="ie. name..."
                  className="mly-h-7 mly-w-36 mly-rounded-md mly-bg-soft-gray mly-px-2 mly-text-sm mly-text-midnight-gray focus:mly-bg-soft-gray focus:mly-outline-none"
                />
              </label>

              <Divider className="mly-mx-1.5" />

              <label className="mly-relative">
                <span className="mly-inline-block mly-px-2 mly-pl-1 mly-text-xs mly-text-midnight-gray">Default</span>
                <input
                  {...AUTOCOMPLETE_PASSWORD_MANAGERS_OFF}
                  value={fallback ?? ''}
                  onChange={(e) => {
                    updateAttributes({
                      fallback: e.target.value,
                    });
                  }}
                  placeholder="ie. John Doe..."
                  className="mly-h-7 mly-w-32 mly-rounded-md mly-bg-soft-gray mly-px-2 mly-pr-6 mly-text-sm mly-text-midnight-gray focus:mly-bg-soft-gray focus:mly-outline-none"
                />
                <div className="mly-absolute mly-inset-y-0 mly-right-1 mly-flex mly-items-center">
                  <Pencil className="mly-h-3 mly-w-3 mly-stroke-[2.5] mly-text-midnight-gray" />
                </div>
              </label>
            </div>
          </TooltipProvider>
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}

export const DefaultRenderVariable: RenderVariableFunction = (props) => {
  const { variable, fallback, from } = props;
  const { name, required, valid } = variable;

  if (from === 'button-variable') {
    return (
      <div className="mly-inline-grid mly-h-7 mly-max-w-xs mly-grid-cols-[12px_1fr] mly-items-center mly-gap-1.5 mly-rounded-md mly-border mly-border-[var(--button-var-border-color)] mly-px-2 mly-font-mono mly-text-sm">
        <Braces className="mly-h-3 mly-w-3 mly-shrink-0 mly-stroke-[2.5]" />
        <span className="mly-min-w-0 mly-truncate mly-text-left">{name}</span>
      </div>
    );
  }

  if (from === 'bubble-variable') {
    return (
      <div
        className={cn(
          'mly-inline-grid mly-h-7 mly-min-w-28 mly-max-w-xs mly-grid-cols-[12px_1fr] mly-items-center mly-gap-1.5 mly-rounded-md mly-border mly-px-2 mly-font-mono mly-text-sm hover:mly-bg-soft-gray',
          !valid && 'mly-border-rose-400 mly-bg-rose-50 mly-text-rose-600 hover:mly-bg-rose-100'
        )}
      >
        <Braces className="mly-h-3 mly-w-3 mly-shrink-0 mly-stroke-[2.5] mly-text-rose-600" />
        <span className="mly-min-w-0 mly-truncate mly-text-left">{name}</span>
      </div>
    );
  }

  return (
    <span
      tabIndex={-1}
      className="mly-inline-flex mly-items-center mly-gap-[var(--variable-icon-gap)] mly-rounded-full mly-border mly-border-gray-200 mly-px-1.5 mly-py-0.5 mly-leading-none"
    >
      <Braces className="mly-size-[var(--variable-icon-size)] mly-shrink-0 mly-stroke-[2.5] mly-text-rose-600" />
      {name}
      {required && !fallback && (
        <AlertTriangle className="mly-size-[var(--variable-icon-size)] mly-shrink-0 mly-stroke-[2.5]" />
      )}
    </span>
  );
};
