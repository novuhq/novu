import { NodeViewContent, NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { Repeat2 } from 'lucide-react';

/**
 * @see https://github.com/arikchakma/maily.to/blob/d7ea26e6b28201fc66c241200adaebc689018b03/packages/core/src/editor/nodes/for/for-view.tsx
 */
export function ForView(props: NodeViewProps) {
  const { editor, getPos } = props;

  return (
    <NodeViewWrapper draggable="true" data-drag-handle="" data-type="repeat" className="mly-relative">
      <NodeViewContent className="is-editable" />
      <div
        role="button"
        data-repeat-indicator=""
        contentEditable={false}
        onClick={() => {
          editor.commands.setNodeSelection(getPos());
        }}
        className="mly-inline-flex mly-items-center mly-gap-1 mly-px-1.5 mly-py-0.5 mly-rounded-sm mly-bg-rose-50 mly-text-xs mly-absolute mly-top-0 mly-right-0 mly-translate-y-[-50%] mly-cursor-grab"
      >
        <Repeat2 className="mly-size-3 mly-stroke-[2.5]" />
        <span className="mly-font-medium">Repeat</span>
      </div>
      <div className="mly-bg-rose-50 absolute right-0 top-0 h-full w-[2px]" />
      <div
        className="mly-bg-rose-50 absolute right-0 top-0 h-[2px] w-[25%]"
        style={{ background: 'linear-gradient(to left, rgb(255 241 242) 60%, transparent)' }}
      />
      <div
        className="mly-bg-rose-50 absolute bottom-0 right-0 h-[2px] w-[25%]"
        style={{ background: 'linear-gradient(to left, rgb(255 241 242) 60%, transparent)' }}
      />
    </NodeViewWrapper>
  );
}
