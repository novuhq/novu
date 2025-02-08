import { UiComponentEnum } from '@novu/shared';

import { DelayAmount } from '@/components/workflow-editor/steps/delay/delay-amount';
import { DigestKey } from '@/components/workflow-editor/steps/digest/digest-key';
import { DigestWindow } from '@/components/workflow-editor/steps/digest/digest-window';
import { EmailBodyEditor } from '@/components/workflow-editor/steps/email/email-body-editor';
import { EmailSubject } from '@/components/workflow-editor/steps/email/email-subject';
import { InAppAction } from '@/components/workflow-editor/steps/in-app/in-app-action';
import { InAppAvatar } from '@/components/workflow-editor/steps/in-app/in-app-avatar';
import { InAppBody } from '@/components/workflow-editor/steps/in-app/in-app-body';
import { InAppRedirect } from '@/components/workflow-editor/steps/in-app/in-app-redirect';
import { InAppSubject } from '@/components/workflow-editor/steps/in-app/in-app-subject';
import { BaseBody } from './base/base-body';
import { BaseSubject } from './base/base-subject';
import { InAppBypassSanitizationSwitch } from './in-app/in-app-bypass-sanitization-switch';

export const getComponentByType = ({ component }: { component?: UiComponentEnum }) => {
  switch (component) {
    case UiComponentEnum.IN_APP_AVATAR: {
      return <InAppAvatar />;
    }
    case UiComponentEnum.IN_APP_SUBJECT: {
      return <InAppSubject />;
    }
    case UiComponentEnum.IN_APP_BODY: {
      return <InAppBody />;
    }
    case UiComponentEnum.IN_APP_BUTTON_DROPDOWN: {
      return <InAppAction />;
    }
    case UiComponentEnum.IN_APP_DISABLE_SANITIZATION_SWITCH: {
      return <InAppBypassSanitizationSwitch />;
    }
    case UiComponentEnum.URL_TEXT_BOX: {
      return <InAppRedirect />;
    }
    case UiComponentEnum.DELAY_AMOUNT:
    case UiComponentEnum.DELAY_UNIT:
    case UiComponentEnum.DELAY_TYPE: {
      return <DelayAmount />;
    }
    case UiComponentEnum.BLOCK_EDITOR: {
      return <EmailBodyEditor />;
    }
    case UiComponentEnum.TEXT_INLINE_LABEL: {
      return <EmailSubject />;
    }
    case UiComponentEnum.DIGEST_KEY: {
      return <DigestKey />;
    }
    case UiComponentEnum.DIGEST_AMOUNT:
    case UiComponentEnum.DIGEST_UNIT:
    case UiComponentEnum.DIGEST_CRON: {
      return <DigestWindow />;
    }
    case UiComponentEnum.PUSH_BODY: {
      return <BaseBody />;
    }
    case UiComponentEnum.PUSH_SUBJECT: {
      return <BaseSubject />;
    }
    case UiComponentEnum.SMS_BODY: {
      return <BaseBody />;
    }
    case UiComponentEnum.CHAT_BODY: {
      return <BaseBody />;
    }
    default: {
      return null;
    }
  }
};
