import { useRef, useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { ActionIcon, useMantineTheme } from '@mantine/core';
import styled from '@emotion/styled';
import { AlignCenterOutlined, AlignLeftOutlined, AlignRightOutlined } from '@ant-design/icons';
import { TextAlignEnum } from '@novu/shared';

import { DotsHorizontalOutlined, Trash, Button, colors, Dropdown } from '@novu/design-system';
import { useEnvController } from '../../../../hooks';
import { useStepFormPath } from '../../hooks/useStepFormPath';

export function ContentRow({
  children,
  onHoverElement,
  onRemove,
  allowRemove,
  blockIndex,
}: {
  children: JSX.Element | JSX.Element[];
  onHoverElement: (data: { top: number; height: number }) => void;
  onRemove: () => void;
  allowRemove: boolean;
  blockIndex: number;
}) {
  const methods = useFormContext();
  const { readonly } = useEnvController();
  const theme = useMantineTheme();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const stepFormPath = useStepFormPath();

  const textAlignments = [
    ['left', <AlignLeftOutlined key="left-align-icon" />],
    ['center', <AlignCenterOutlined key="center-align-icon" />],
    ['right', <AlignRightOutlined key="right-align-icon" />],
  ];

  function onHover() {
    if (!parentRef.current) return;

    onHoverElement({
      top: parentRef.current.offsetTop,
      height: parentRef.current.offsetHeight,
    });
  }

  const rowStyleMenu = [
    <Dropdown.Label key="alignBtn" sx={{ fontSize: '14px' }}>
      Align Text
    </Dropdown.Label>,
    <Controller
      key="button-wrapper"
      name={`${stepFormPath}.template.content.${blockIndex}.styles.textAlign`}
      defaultValue={TextAlignEnum.LEFT}
      control={methods.control}
      render={({ field }) => {
        return (
          <TextAlignmentWrapper colorScheme={theme.colorScheme}>
            {textAlignments.map(([dir, icon], i) => (
              <Button
                key={`align-${dir as string}-btn`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  field.onChange(dir);
                }}
                data-test-id={`align-${dir as string}-btn`}
                variant={dir === field.value ? 'gradient' : 'outline'}
              >
                {icon}
              </Button>
            ))}
          </TextAlignmentWrapper>
        );
      }}
    />,
    <Dropdown.Item
      key="remove-row-btn"
      disabled={!allowRemove}
      data-test-id="remove-row-btn"
      onClick={onRemove}
      icon={<Trash />}
    >
      Remove Row
    </Dropdown.Item>,
  ];

  return (
    <div onMouseEnter={onHover} ref={parentRef} role="presentation" data-test-id="editor-row">
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
              position="top"
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
