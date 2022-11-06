import { Component, Prop, h } from '@stencil/core';
import { css } from '@emotion/css';
import { IMessage } from '@novu/shared';

import { MessageActionStatusEnum } from '../../types';

const actionWrapperStyles = css`
  margin-left: -5px;
  margin-right: -5px;
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  max-height: 50px;
`;

@Component({
  tag: 'action-wrapper',
})
export class ActionWrapper {
  @Prop() notification: IMessage;

  render() {
    const actionsResultBlock = null;
    const ctaAction = this.notification.cta.action;
    const actionStatus = ctaAction?.status;
    const templateIdentifier = this.notification.templateIdentifier;

    // TODO:
    if (actionsResultBlock && actionStatus === MessageActionStatusEnum.DONE) {
      return actionsResultBlock(templateIdentifier, ctaAction);
    }

    if (ctaAction) {
      const buttons = ctaAction?.buttons;

      return (
        <div class={actionWrapperStyles}>
          {actionStatus !== MessageActionStatusEnum.DONE &&
            buttons?.map((button, buttonIndex) => (
              <notification-button
                onClick={(_) => {
                  // TODO
                  // onActionClick(buttonType)
                }}
                key={button.type}
                messageAction={ctaAction}
                index={buttonIndex}
              ></notification-button>
            ))}
        </div>
      );
    }

    return null;
  }
}
