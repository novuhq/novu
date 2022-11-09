import { useEffect, useRef, useState } from 'react';
import { ActionIcon, useMantineTheme } from '@mantine/core';
import styled from '@emotion/styled';
import { AlignCenterOutlined, AlignLeftOutlined, AlignRightOutlined } from '@ant-design/icons';
import { IEmailBlock } from '@novu/shared';

import { DotsHorizontalOutlined, Trash } from '../../../design-system/icons';
import { Button, colors, Dropdown } from '../../../design-system';
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
  const theme = useMantineTheme();
  const [textAlign, settextAlign] = useState<'left' | 'right' | 'center'>(block?.styles?.textAlign || 'left');
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const textAlignments = [
    ['left', <AlignLeftOutlined />],
    ['center', <AlignCenterOutlined />],
    ['right', <AlignRightOutlined />],
  ];

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

  const changeRowStyles = (e, dir) => {
    e.preventDefault();
    e.stopPropagation();
    settextAlign(dir);
  };

  const rowStyleMenu = [
    <Dropdown.Label style={{ fontSize: '14px' }}>Align Text</Dropdown.Label>,
    <TextAlignmentWrapper colorScheme={theme.colorScheme}>
      {textAlignments.map(([dir, icon]) => (
        <Button
          onClick={(e) => changeRowStyles(e, dir)}
          data-test-id={`align-${dir}-btn`}
          variant={dir === textAlign ? 'gradient' : 'outline'}
        >
          {icon}
        </Button>
      ))}
    </TextAlignmentWrapper>,
    <Dropdown.Item
      key="removeBtn"
      disabled={!allowRemove}
      data-test-id="remove-row-btn"
      onClick={onRemove}
      icon={<Trash />}
    >
      Remove Row
    </Dropdown.Item>,
  ];

  return (
    <div onMouseEnter={onHover} ref={parentRef} data-test-id="editor-row">
      <ContentRowWrapper>
        <div style={{ width: '100%' }}>{children}</div>
        <SettingsWrapper>
          {!readonly && (
            <Dropdown
              onClose={() => setDropdownOpen(false)}
              onOpen={() => setDropdownOpen(true)}
              control={
                <SettingsButton data-test-id="settings-row-btn" visible={dropdownOpen}>
                  <ActionIcon variant="transparent">
                    <DotsHorizontalOutlined color={colors.B60} />
                  </ActionIcon>
                </SettingsButton>
              }
            >
              {rowStyleMenu}
            </Dropdown>
          )}
        </SettingsWrapper>
      </ContentRowWrapper>
    </div>
  );
}

const SettingsWrapper = styled.div`
  width: 50px;
  height: 0;
  display: flex;
  align-items: center;
  justify-content: end;
`;

const SettingsButton = styled.div<{ visible: boolean }>`
  display: ${({ visible }) => (visible ? 'inline-block' : 'none')};
`;

const ContentRowWrapper = styled.div`
  width: 100%;
  outline: transparent;
  padding-bottom: 10px;
  display: flex;
  align-items: center;

  &:hover {
    ${SettingsButton} {
      display: inline-block;
    }
  }
`;

const TextAlignmentWrapper = styled.div<{ colorScheme: 'light' | 'dark' }>`
  display: flex;
  justify-content: space-between;
  padding: 5px 15px 15px 15px;

  button {
    padding: 0;
    margin: 0 5px;
    width: 100%;
  }

  .anticon svg {
    color: ${({ colorScheme }) => (colorScheme === 'dark' ? colors.white : colors.B40)};
  }
`;
