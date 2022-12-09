import React from 'react';
import { IMessageAction, ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';
import styled from '@emotion/styled';
import { cx, css } from '@emotion/css';

import { NotificationButton } from './NotificationItemButton';
import { useStyles } from '../../../../store/styles';

export interface IActionContainerProps {
  action?: IMessageAction;
  onActionClick: (actionButtonType: ButtonTypeEnum) => void;
}

export function ActionContainer({ action, onActionClick }: IActionContainerProps) {
  const status = action?.status;
  const buttons = action?.buttons;
  const [buttonsContainerStyles, primaryButtonStyles, secondaryButtonStyles] = useStyles([
    'notifications.listItem.buttons.root',
    'notifications.listItem.buttons.primary',
    'notifications.listItem.buttons.secondary',
  ]);

  function handleOnClick(buttonType: ButtonTypeEnum) {
    onActionClick(buttonType);
  }

  return (
    <TemplateContainerWrap>
      <TemplateContainer className={cx('nc-notifications-list-item-buttons', css(buttonsContainerStyles))}>
        {status === MessageActionStatusEnum.DONE
          ? null
          : buttons?.map((button, buttonIndex) => (
              <NotificationButton
                key={button.type}
                className={cx(
                  'nc-notifications-list-item-button',
                  css(button.type === ButtonTypeEnum.PRIMARY ? primaryButtonStyles : secondaryButtonStyles)
                )}
                onActionClick={(buttonType) => handleOnClick(buttonType)}
                messageAction={action}
                buttonIndex={buttonIndex}
              />
            ))}
      </TemplateContainer>
    </TemplateContainerWrap>
  );
}

const TemplateContainerWrap = styled.div`
  margin-left: 10px;
  margin-right: 10px;
`;

const TemplateContainer = styled.div`
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  max-height: 50px;
  margin-left: -15px;
  margin-right: -15px;
`;
