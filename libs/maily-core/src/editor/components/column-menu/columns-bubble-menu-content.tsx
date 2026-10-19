/** biome-ignore-all lint/correctness/useHookAtTopLevel: needs to be fixed */
import { Space, Trash } from 'lucide-react';
import { addColumnByIndex, removeColumnByIndex, updateColumnWidth } from '@/editor/utils/columns';
import { deleteNode } from '@/editor/utils/delete-node';
import { spacing } from '@/editor/utils/spacing';
import { BubbleMenuButton } from '../bubble-menu-button';
import { ShowPopover } from '../show-popover';
import { EditorBubbleMenuProps } from '../text-menu/text-bubble-menu';
import { Divider } from '../ui/divider';
import { Select } from '../ui/select';
import { TooltipProvider } from '../ui/tooltip';
import { VerticalAlignmentSwitch } from '../vertical-alignment-switch';
import { ColumnsWidthConfig } from './columns-width-config';
import { useColumnsState } from './use-columns-state';

type ColumnsBubbleMenuProps = {
  editor: EditorBubbleMenuProps['editor'];
};

export function ColumnsBubbleMenuContent(props: ColumnsBubbleMenuProps) {
  const { editor } = props;
  if (!editor) {
    return null;
  }

  const state = useColumnsState(editor);

  const currentColumnCount = state.columnsCount;

  return (
    <TooltipProvider>
      <div className="mly-flex mly-items-stretch">
        {state.isColumnActive && (
          <>
            <ColumnsWidthConfig
              columnsCount={currentColumnCount}
              columnWidths={state.columnWidths}
              onColumnsCountChange={(count) => {
                if (count > currentColumnCount) {
                  addColumnByIndex(editor);
                } else {
                  removeColumnByIndex(editor);
                }
              }}
              onColumnWidthChange={(index, width) => {
                updateColumnWidth(editor, index, width);
              }}
            />

            <Divider />
          </>
        )}

        <VerticalAlignmentSwitch
          alignment={state.currentVerticalAlignment}
          onAlignmentChange={(value) => {
            editor.commands.updateColumn({
              verticalAlign: value,
            });
          }}
        />

        <Divider />

        <Select
          icon={Space}
          label="Columns Gap"
          value={state.currentColumnsGap}
          options={[
            { value: '0', label: 'None' },
            ...spacing.map((space) => ({
              label: space.name,
              value: String(space.value),
            })),
          ]}
          onValueChange={(value) => {
            editor.commands.updateColumns({
              gap: +value,
            });
          }}
          tooltip="Columns Gap"
        />

        <Divider />

        <BubbleMenuButton
          icon={Trash}
          tooltip="Delete Columns"
          command={() => {
            deleteNode(editor, 'columns');
          }}
        />

        <Divider />

        <ShowPopover
          showIfKey={state.currentShowIfKey}
          onShowIfKeyValueChange={(value) => {
            editor.commands.updateColumns({
              showIfKey: value,
            });
          }}
          editor={editor}
        />
      </div>
    </TooltipProvider>
  );
}
