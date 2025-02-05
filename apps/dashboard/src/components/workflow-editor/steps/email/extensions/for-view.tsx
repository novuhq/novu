import { Editor, NodeViewContent, NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { Lightbulb, Repeat2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

function TooltipContent({ forNodeEachKey, currentProperty }: { forNodeEachKey: string; currentProperty: string }) {
  return (
    <p className="mly-top-1/2 mly-left-1/2 -mly-translate-x-1/2 -mly-translate-y-1/2 mly-text-gray-400 mly-shadow-sm absolute z-[1] flex items-center gap-2 rounded-md bg-white px-3 py-1.5">
      <Lightbulb className="size-3.5 stroke-[2] text-gray-400" />
      Access 'for' loop items using{' '}
      <code className="mly-px-1 mly-py-0.5 mly-bg-gray-50 mly-rounded mly-font-mono mly-text-gray-400">
        {`{{ ${forNodeEachKey}`}
        <span className="inline-block pr-1">
          <AnimatePresence mode="wait">
            <motion.span
              key={currentProperty}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="inline-block"
            >
              {currentProperty}
            </motion.span>
          </AnimatePresence>
        </span>
      </code>
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
  const forNodeEachKey = forNode?.attrs.each;

  const isCursorInForNode = cursorPos >= pos && cursorPos <= forNodeEndPos;
  const isOnEmptyForNodeLine = isOnEmptyLine(editor, cursorPos) && isCursorInForNode;

  const [currentProperty, setCurrentProperty] = useState('\u00A0}}');

  function isOnEmptyLine(editor: Editor, cursorPos: number) {
    const currentLineContent = editor.state.doc
      .textBetween(
        Math.max(0, editor.state.doc.resolve(cursorPos).start()),
        Math.min(editor.state.doc.content.size, editor.state.doc.resolve(cursorPos).end())
      )
      .trim();

    return currentLineContent === '';
  }

  useEffect(() => {
    const properties = ['\u00A0}}', '.foo }}', '.bar }}', '.attr }}'];
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % properties.length;
      setCurrentProperty(properties[currentIndex]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <NodeViewWrapper draggable="true" data-drag-handle="" data-type="for" className="mly-relative">
      <NodeViewContent className="is-editable" />
      {isOnEmptyForNodeLine && forNodeEachKey && (
        <TooltipContent forNodeEachKey={forNodeEachKey} currentProperty={currentProperty} />
      )}
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
