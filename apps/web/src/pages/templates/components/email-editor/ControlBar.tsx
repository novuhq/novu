import { ActionIcon, Divider } from '@mantine/core';
import { DoubleArrowRight, PlusCircleOutlined, TextAlignment, colors, Dropdown } from '@novu/design-system';
import { EmailBlockTypeEnum } from '@novu/shared';

export function ControlBar({ top, onBlockAdd }: { top: number; onBlockAdd: (type: EmailBlockTypeEnum) => void }) {
  const actionsMenu = [
    <Dropdown.Item
      key="control-bar-add"
      data-test-id="add-btn-block"
      icon={<DoubleArrowRight />}
      onClick={() => onBlockAdd(EmailBlockTypeEnum.BUTTON)}
    >
      Add Button
    </Dropdown.Item>,
    <Dropdown.Item
      key="add-text-button"
      data-test-id="add-text-block"
      icon={<TextAlignment />}
      onClick={() => onBlockAdd(EmailBlockTypeEnum.TEXT)}
    >
      Add Text
    </Dropdown.Item>,
  ];

  return (
    <Divider
      data-test-id="control-bar"
      variant="dashed"
      mx={0}
      color={colors.B60}
      style={{ top: `${top}px` }}
      label={
        <Dropdown
          control={
            <ActionIcon data-test-id="control-add" variant="transparent">
              <PlusCircleOutlined color={colors.B60} />
            </ActionIcon>
          }
        >
          {actionsMenu}
        </Dropdown>
      }
    />
  );
}
