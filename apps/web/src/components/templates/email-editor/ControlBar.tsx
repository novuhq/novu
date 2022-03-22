import { ActionIcon, Divider, MenuItem as DropdownItem, useMantineTheme } from '@mantine/core';
import { DoubleArrowRight, PlusCircleOutlined, TextAlignment } from '../../../design-system/icons';
import { colors, Dropdown } from '../../../design-system';

export function ControlBar({ top, onBlockAdd }: { top: number; onBlockAdd: (type: 'button' | 'text') => void }) {
  const theme = useMantineTheme();
  const actionsMenu = [
    <DropdownItem
      key="control-bar-add"
      data-test-id="add-btn-block"
      icon={<DoubleArrowRight />}
      onClick={() => onBlockAdd('button')}>
      Add Button
    </DropdownItem>,
    <DropdownItem
      key="add-text-button"
      data-test-id="add-text-block"
      icon={<TextAlignment />}
      onClick={() => onBlockAdd('text')}>
      Add Text
    </DropdownItem>,
  ];

  return (
    <Divider
      data-test-id="control-bar"
      variant="dashed"
      mx={0}
      style={{ top: `${top}px` }}
      label={
        <Dropdown
          control={
            <ActionIcon data-test-id="control-add" variant="transparent">
              <PlusCircleOutlined color={theme.colorScheme === 'dark' ? colors.B30 : colors.B80} />
            </ActionIcon>
          }>
          {actionsMenu}
        </Dropdown>
      }
    />
  );
}
