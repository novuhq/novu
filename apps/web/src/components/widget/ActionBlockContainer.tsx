import React from 'react';
import { darkButtonStyle, IMessageButton, lightButtonStyle } from '@novu/shared';
import { TextInput, useMantineTheme } from '@mantine/core';
import { RemoveCircle } from '../../design-system/icons/general/RemoveCircle';
import styled from '@emotion/styled';
import { Button, colors } from '../../design-system';

export function ActionBlockContainer({
  onChangeCtaAdapter,
  onButtonAddClickHandle,
  onRemoveTemplate,
  isButtonsTemplateSelected,
  selectedTemplate,
}: {
  onChangeCtaAdapter: (actions: IMessageButton[]) => void;
  onButtonAddClickHandle: () => void;
  onRemoveTemplate: () => void;
  isButtonsTemplateSelected: boolean;
  selectedTemplate: IMessageButton[];
}) {
  return (
    <>
      {isButtonsTemplateSelected ? (
        <SelectedButtonTemplate
          onChangeCtaAdapter={onChangeCtaAdapter}
          selectedTemplate={selectedTemplate}
          onRemoveTemplate={onRemoveTemplate}
        />
      ) : (
        <AddButtonSection onButtonAddClick={onButtonAddClickHandle} />
      )}
    </>
  );
}

interface ISelectedButtonTemplateProps {
  selectedTemplate: IMessageButton[];
  onRemoveTemplate: () => void;
  onChangeCtaAdapter: (actions: IMessageButton[]) => void;
}

function SelectedButtonTemplate(props: ISelectedButtonTemplateProps) {
  const dark = useMantineTheme().colorScheme === 'dark';
  const buttonStyle = dark ? darkButtonStyle : lightButtonStyle;

  function handleOnButtonContentChange(data: any, buttonIndex: number) {
    const selectedTemplateClone = [...props.selectedTemplate];
    selectedTemplateClone[buttonIndex].content = data.target.value;
    props.onChangeCtaAdapter(selectedTemplateClone);
  }

  const lastButtonType = props.selectedTemplate[props.selectedTemplate.length - 1]?.type;

  return (
    <>
      <TemplateContainerWrap>
        <TemplateContainer>
          {props.selectedTemplate.map((button: IMessageButton, buttonIndex: number) => {
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
