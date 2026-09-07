import { NodeViewContent, NodeViewProps, NodeViewWrapper } from '@tiptap/react';

export function CardActionsView(props: NodeViewProps) {
  const { editor, getPos } = props;

  return (
    <NodeViewWrapper
      data-type="cardActions"
      draggable={editor.isEditable}
      data-drag-handle={editor.isEditable}
      className="mly-relative mly-my-1"
    >
      <NodeViewContent
        as="div"
        className="mly-w-full"
        onClick={(event: React.MouseEvent<HTMLDivElement>) => {
          if (!editor.isEditable) {
            return;
          }

          // Clicking the row background (not a button) opens the actions menu for the whole row.
          if (event.target === event.currentTarget) {
            editor.commands.setNodeSelection(getPos());
          }
        }}
      />
    </NodeViewWrapper>
  );
}
