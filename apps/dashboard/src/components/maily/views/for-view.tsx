import { NodeViewContent, NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { Repeat2 } from 'lucide-react';

/**
 * @see https://github.com/arikchakma/maily.to/blob/d7ea26e6b28201fc66c241200adaebc689018b03/packages/core/src/editor/nodes/for/for-view.tsx
 */
export function ForView(props: NodeViewProps) {
  const { editor, getPos } = props;

  return (
    <NodeViewWrapper
      draggable="true"
      data-drag-handle=""
      data-type="repeat"
      className="mly-relative border-soft-100 mx-[-0.5rem] rounded-md border px-3 py-3"
    >
      <NodeViewContent className="is-editable" />
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
