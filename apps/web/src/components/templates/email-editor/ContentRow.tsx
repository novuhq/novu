import { IEmailBlock } from '@novu/shared';
import { useEffect, useRef, useState } from 'react';
import { ActionIcon, MenuItem as DropdownItem, RadioGroup, Radio, useMantineTheme } from '@mantine/core';
import styled from '@emotion/styled';
import { DotsHorizontalOutlined, Trash } from '../../../design-system/icons';
import { colors, Dropdown } from '../../../design-system';
import { useEnvController } from '../../../store/use-env-controller';

export function ContentRow({
  children,
  onHoverElement,
  onRemove,
  allowRemove,
  block,
  onStyleChanged,
}: {
  children: JSX.Element | JSX.Element[];
  onHoverElement: (data: { top: number; height: number }) => void;
  onRemove: () => void;
  allowRemove: boolean;
  block: IEmailBlock;
  onStyleChanged: (data: { textAlign: 'left' | 'right' | 'center' }) => void;
}) {
  const { readonly } = useEnvController();
  const [textAlign, settextAlign] = useState<'left' | 'right' | 'center'>(block?.styles?.textAlign || 'left');
  const parentRef = useRef<HTMLDivElement>(null);
  const theme = useMantineTheme();

  function onHover() {
    if (!parentRef.current) return;

    onHoverElement({
      top: parentRef.current.offsetTop,
      height: parentRef.current.offsetHeight,
    });
  }

  useEffect(() => {
    onStyleChanged({
      textAlign,
    });
  }, [textAlign]);

  const changeRowStyles = (value) => {
    settextAlign(value);
  };

  const rowStyleMenu = [
    <DropdownItem key="left" sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
      <RadioGroup value={textAlign} onChange={changeRowStyles}>
        <Radio value="left" data-test-id="align-left-btn" label="Align Left" />
        <Radio value="center" data-test-id="align-center-btn" label="Align Center" />
        <Radio value="right" data-test-id="align-right-btn" label="Align Right" />
      </RadioGroup>
    </DropdownItem>,
    <DropdownItem
      key="removeBtn"
      disabled={!allowRemove}
      data-test-id="remove-row-btn"
      onClick={onRemove}
      icon={<Trash />}
    >
      Remove Row
    </DropdownItem>,
  ];

  return (
    <div onMouseEnter={onHover} ref={parentRef} data-test-id="editor-row">
      <ContentRowWrapper>
        <div style={{ width: 'calc(100% - 20px)' }}>{children}</div>
        {!readonly && (
          <Dropdown
            control={
              <SettingsButton data-test-id="settings-row-btn">
                <ActionIcon variant="transparent">
                  <DotsHorizontalOutlined color={theme.colorScheme === 'dark' ? colors.B30 : colors.B80} />
                </ActionIcon>
              </SettingsButton>
            }
          >
            {rowStyleMenu}
          </Dropdown>
        )}
      </ContentRowWrapper>
    </div>
  );
}

const SettingsButton = styled.div`
  display: none;
  right: -10px;
  position: absolute;
`;

const ContentRowWrapper = styled.div`
  width: 100%;
  outline: transparent;
  padding-bottom: 10px;
  display: flex;

  &:hover {
    ${SettingsButton} {
      display: inline-block;
    }
  }
`;
