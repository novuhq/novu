import { Editor, NodeViewContent, NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { Lightbulb, Repeat2 } from 'lucide-react';
import { VariablePill } from '@/components/variable/variable-pill';

function TooltipContent() {
  return (
    <p className="shadow-xs absolute left-0 top-[calc(100%+8px)] z-10 flex items-center justify-center gap-2 rounded-md border border-neutral-100 bg-white px-2 py-1">
      <Lightbulb className="size-3.5" />
      <span className="text-xs font-medium">Use iterable variables to access the current item in the loop, e.g.</span>
      <VariablePill
        variableName="current."
        hasFilters={false}
        className="bg-bg-weak pointer-events-none text-xs font-medium"
      />
    </p>
  );
}

/**
 * @see https://github.com/arikchakma/maily.to/blob/d7ea26e6b28201fc66c241200adaebc689018b03/packages/core/src/editor/nodes/for/for-view.tsx
 */
export function ForView(props: NodeViewProps) {
  const { editor, getPos } = props;

  const pos = getPos();
  const cursorPos = editor.state.selection.from;

  const forNode = editor.state.doc.nodeAt(pos);
  const forNodeEndPos = pos + (forNode?.nodeSize ?? 0);

  const isCursorInForNode = cursorPos >= pos && cursorPos <= forNodeEndPos;
  const isOnEmptyForNodeLine = isOnEmptyLine(editor, cursorPos) && isCursorInForNode;

  function isOnEmptyLine(editor: Editor, cursorPos: number) {
    const $pos = editor.state.doc.resolve(cursorPos);
    const node = $pos.parent;
    const hasContent = node.content.size > 0;

    return !hasContent;
  }

  return (
    <NodeViewWrapper
      draggable="true"
      data-drag-handle=""
      data-type="repeat"
      className="mly-relative border-soft-100 mx-[-0.5rem] rounded-md border px-2 py-2"
    >
      <NodeViewContent className="is-editable" />
      {isOnEmptyForNodeLine && <TooltipContent />}
      <div
        role="button"
        data-repeat-indicator=""
        contentEditable={false}
        onClick={() => {
          editor.commands.setNodeSelection(getPos());
        }}
        className="border-soft-100 absolute right-[-2px] top-[-3px] flex cursor-grab items-center justify-center gap-[2px] rounded border bg-white px-1 py-[2px]"
      >
        <Repeat2 className="size-3 flex-shrink-0" />
        <span className="text-2xs font-medium leading-[1]">repeat</span>
      </div>
    </NodeViewWrapper>
  );
}
