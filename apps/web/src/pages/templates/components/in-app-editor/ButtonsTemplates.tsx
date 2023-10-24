import { ButtonTypeEnum, IMessageButton, darkButtonStyle, lightButtonStyle } from '@novu/shared';
import styled from '@emotion/styled';
import { Divider, useMantineTheme } from '@mantine/core';
import { Button } from '@novu/design-system';

interface IButtonsTemplatesProps {
  setTemplateSelected: (boolean) => void;
  setIsPopoverVisible: (boolean) => void;
  setSelectedTemplate: (any) => void;
}

export function ButtonsTemplates(props: IButtonsTemplatesProps) {
  const templates: IButtonTemplates = {
    templates: [
      [{ type: ButtonTypeEnum.PRIMARY, content: 'Primary' }],
      [{ type: ButtonTypeEnum.SECONDARY, content: 'Secondary' }],
      [
        { type: ButtonTypeEnum.PRIMARY, content: 'Primary' },
        { type: ButtonTypeEnum.SECONDARY, content: 'Secondary' },
      ],
    ],
  };

  function handleOnTemplateClick(index: number) {
    props.setTemplateSelected(true);
    props.setSelectedTemplate(templates.templates[index]);
    props.setIsPopoverVisible(false);
  }

  return (
    <>
      <TemplatesContainer>
        {templates.templates.map((template: IMessageButton[], templatesIndex) => {
          return (
            <div key={templatesIndex}>
              <TemplateContainerWrap>
                <TemplateContainer
                  data-test-id={'template-container-click-area'}
                  onClick={() => handleOnTemplateClick(templatesIndex)}
                  key={templatesIndex}
                >
                  {template.map((button: IMessageButton, buttonIndex: number) => {
                    return <TemplateButton key={templatesIndex + buttonIndex} button={button} />;
                  })}
                </TemplateContainer>
              </TemplateContainerWrap>

              {templates.templates.length > templatesIndex + 1 ? (
                <Divider style={{ margin: '15px 0' }} my="sm" />
              ) : null}
            </div>
          );
        })}
      </TemplatesContainer>
    </>
  );
}

const TemplateContainerWrap = styled.div`
  margin-left: 10px;
  margin-right: 10px;
`;

const TemplatesContainer = styled.div`
  width: 300px;
  padding: 15px;
`;

const TemplateContainer = styled.div`
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  max-height: 50px;
  margin-left: -15px;
  margin-right: -15px;
`;

interface IButtonTemplates {
  templates: IMessageButton[][];
}

interface ITemplateButton {
  button: IMessageButton;
  buttonIndex?: number;
}

export function TemplateButton(props: ITemplateButton) {
  const dark = useMantineTheme().colorScheme === 'dark';
  const buttonStyles = (dark ? darkButtonStyle : lightButtonStyle)[props.button.type];

  const buttonText = props.button?.content ? props.button?.content : '';

  return (
    <ActionButton background={buttonStyles.backGroundColor} color={buttonStyles.fontColor} fullWidth>
      {buttonText}
    </ActionButton>
  );
}

const ActionButton = styled(Button)<{ background: string; color: string }>`
  height: 30px;
  font-size: 12px;
  background: ${({ background }) => background};
  color: ${({ color }) => color};
  box-shadow: none;
  display: flex;
  justify-content: center;
  margin-left: 5px;
  margin-right: 5px;
`;
