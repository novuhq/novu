import React from 'react';
import {
  darkButtonStyle,
  IMessageButton,
  lightButtonStyle,
  ButtonTypeEnum,
  IMessageAction,
  MessageActionStatusEnum,
} from '@novu/shared';
import { TextInput, useMantineTheme } from '@mantine/core';
import { RemoveCircle } from '../../design-system/icons/general/RemoveCircle';
import styled from '@emotion/styled';
import { Button, colors } from '../../design-system';

export function ActionBlockContainer({
  onButtonAddClickHandle,
  onRemoveTemplate,
  isButtonsTemplateSelected,
  onChange,
  value,
}: {
  onButtonAddClickHandle: () => void;
  onRemoveTemplate: () => void;
  isButtonsTemplateSelected: boolean;
  onChange: (data: any) => void;
  value: IMessageAction;
}) {
  return (
    <>
      {isButtonsTemplateSelected ? (
        <SelectedButtonTemplate onChange={onChange} value={value} onRemoveTemplate={onRemoveTemplate} />
      ) : (
        <AddButtonSection onButtonAddClick={onButtonAddClickHandle} />
      )}
    </>
  );
}

interface ISelectedButtonTemplateProps {
  value: IMessageAction;
  onRemoveTemplate: () => void;
  onChange: (actions: any) => void;
}

function SelectedButtonTemplate(props: ISelectedButtonTemplateProps) {
  const dark = useMantineTheme().colorScheme === 'dark';
  const buttonStyle = dark ? darkButtonStyle : lightButtonStyle;

  function handleOnButtonContentChange(data: any, buttonIndex: number) {
    const currentButtonsValue = props?.value?.buttons ? [...props?.value?.buttons] : [];

    if (currentButtonsValue) {
      if (currentButtonsValue[buttonIndex]) {
        currentButtonsValue[buttonIndex].content = data.target.value;
        const newAction = { buttons: currentButtonsValue, status: MessageActionStatusEnum.PENDING };
        props.onChange(newAction);
      }
    }
  }

  const lastButtonType = props?.value?.buttons
    ? props?.value?.buttons[props.value.buttons.length - 1]?.type
    : ButtonTypeEnum.PRIMARY;

  const buttons = props.value?.buttons;

  // eslint-disable-next-line no-console
  console.log(buttons);

  return (
    <>
      <TemplateContainerWrap>
        <TemplateContainer>
          {buttons?.map((button: IMessageButton, buttonIndex: number) => {
            const buttonText = button?.content ? button?.content : '';

            return (
              <NotificationButton buttonStyle={buttonStyle[button.type]} fullWidth key={buttonIndex}>
                <ButtonInput
                  buttonStyle={buttonStyle[button.type]}
                  value={buttonText}
                  onChange={(data) => {
                    handleOnButtonContentChange(data, buttonIndex);
                  }}
                />
              </NotificationButton>
            );
          })}
          <DeleteIcon buttonStyle={buttonStyle[lastButtonType]}>
            <RemoveCircle onClick={props.onRemoveTemplate} />
          </DeleteIcon>
        </TemplateContainer>
      </TemplateContainerWrap>
    </>
  );
}

function AddButtonSection({ onButtonAddClick }: { onButtonAddClick?: () => void }) {
  return (
    <StyledButton data-test-id="control-add" onClick={onButtonAddClick}>
      <span>+ Add Button</span>
    </StyledButton>
  );
}

const StyledButton = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 44px;
  border: dashed;
  border-radius: 7px;
  margin: 14px 0 14px 0;
  color: ${colors.B60};
  cursor: pointer;
`;

const TemplateContainer = styled.div`
  position: relative;
  display: flex;
  justify-content: space-between;
  margin: 15px -15px;
`;

const TemplateContainerWrap = styled.div`
  margin-left: 10px;
  margin-right: 10px;
  border: none;
`;

const NotificationButton = styled(Button)<{ buttonStyle }>`
  background: ${({ buttonStyle }) => buttonStyle.backGroundColor};
  position: relative;
  cursor: default;
  justify-content: center;
  display: flex;
  margin-left: 5px;
  margin-right: 5px;
  text-align-last: center;
  border: none;
  box-shadow: none;
`;

const DeleteIcon = styled.div<{ buttonStyle }>`
  align-content: center;
  position: absolute;
  align-items: center;
  height: 14px;
  top: 14px;
  right: 14px;
  cursor: pointer;
  path {
    fill: ${({ buttonStyle }) => buttonStyle.removeCircleColor};
  }
`;

const ButtonInput = styled(TextInput)<{ buttonStyle }>`
  display: flex;
  align-content: center;
  text-align: center;
  border: none;
  cursor: none;
  input {
    border: transparent;
    background: transparent;
    color: ${({ buttonStyle }) => buttonStyle.fontColor};
    font-weight: 700;
  }
`;
