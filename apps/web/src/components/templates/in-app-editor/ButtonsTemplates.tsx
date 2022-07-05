import { ButtonTypeEnum, IMessageButton } from '@novu/shared';
import styled from '@emotion/styled';
import { Divider } from '@mantine/core';
import { Button } from '../../../design-system';

interface IButtonsTemplatesProps {
  setTemplateSelected: (boolean) => void;
  setIsPopoverVisible: (boolean) => void;
  setSelectedTemplate: (any) => void;
}

export function ButtonsTemplates(props: IButtonsTemplatesProps) {
  const templates: IButtonTemplates = {
    templates: [
      [{ type: ButtonTypeEnum.PRIMARY, content: 'OK' }],
      [{ type: ButtonTypeEnum.SECONDARY, content: 'DECLINE' }],
      [
        { type: ButtonTypeEnum.PRIMARY, content: 'OK' },
        { type: ButtonTypeEnum.SECONDARY, content: 'DECLINE' },
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
            <>
              <TemplateContainerWrap>
                <TemplateContainer onClick={() => handleOnTemplateClick(templatesIndex)} key={templatesIndex}>
                  {template.map((button: IMessageButton, buttonIndex: number) => {
                    return <TemplateButton key={templatesIndex + buttonIndex} button={button} />;
                  })}
                </TemplateContainer>
              </TemplateContainerWrap>

              {templates.templates.length > templatesIndex + 1 ? <Divider my="sm" /> : null}
            </>
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
  const buttonText = props.button?.content ? props.button?.content : '';

  return <StyledButton fullWidth>{buttonText}</StyledButton>;
}

const StyledButton = styled(Button)`
  display: flex;
  justify-content: center;
  margin-left: 5px;
  margin-right: 5px;
`;
