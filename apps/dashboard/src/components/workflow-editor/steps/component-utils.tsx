import { EnvironmentTypeEnum, UiComponentEnum } from '@novu/shared';
import { EmailEditorSelect } from '@/components/email-editor-select';
import { DelayWindow } from '@/components/workflow-editor/steps/delay/delay-window';
import { DigestDelayTabs } from '@/components/workflow-editor/steps/digest-delay-tabs/digest-delay-tabs';
import { DigestKey } from '@/components/workflow-editor/steps/digest-delay-tabs/digest-key';
import { EmailBody } from '@/components/workflow-editor/steps/email/email-body';
import { EmailSubject } from '@/components/workflow-editor/steps/email/email-subject';
import { InAppAction } from '@/components/workflow-editor/steps/in-app/in-app-action';
import { InAppAvatar } from '@/components/workflow-editor/steps/in-app/in-app-avatar';
import { InAppBody } from '@/components/workflow-editor/steps/in-app/in-app-body';
import { InAppRedirect } from '@/components/workflow-editor/steps/in-app/in-app-redirect';
import { InAppSubject } from '@/components/workflow-editor/steps/in-app/in-app-subject';
import { ThrottleKey } from '@/components/workflow-editor/steps/throttle/throttle-key';
import { ThrottleThreshold } from '@/components/workflow-editor/steps/throttle/throttle-threshold';
import { ThrottleWindow } from '@/components/workflow-editor/steps/throttle/throttle-window';
import { useEnvironment } from '@/context/environment/hooks';
import { useWorkflow } from '../workflow-provider';
import { BaseBody } from './base/base-body';
import { BaseSubject } from './base/base-subject';
import { DataObject } from './base/data-object';
import { EmailRendererSelect } from './email/email-renderer-select';
import { LayoutSelect } from './email/layout-select';
import { useSaveForm } from './save-form-context';
import { BypassSanitizationSwitch } from './shared/bypass-sanitization-switch';
import { ExtendToSchedule } from './shared/extend-to-schedule';

const EmailEditorSelectInternal = () => {
  const { isUpdatePatchPending } = useWorkflow();
  const { saveForm } = useSaveForm();
  const { currentEnvironment } = useEnvironment();

  return (
    <EmailEditorSelect
      isLoading={isUpdatePatchPending}
      saveForm={saveForm}
      disabled={currentEnvironment?.type !== EnvironmentTypeEnum.DEV}
    />
  );
};

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

    case UiComponentEnum.IN_APP_DISABLE_SANITIZATION_SWITCH:
      return <BypassSanitizationSwitch />;

    case UiComponentEnum.DATA: {
      return <DataObject />;
    }

    case UiComponentEnum.URL_TEXT_BOX: {
      return <InAppRedirect />;
    }

    case UiComponentEnum.EMAIL_EDITOR_SELECT: {
      return <EmailEditorSelectInternal />;
    }

    case UiComponentEnum.EMAIL_BODY:
    case UiComponentEnum.BLOCK_EDITOR:
      return <EmailBody />;

    case UiComponentEnum.TEXT_INLINE_LABEL: {
      return <EmailSubject />;
    }

    case UiComponentEnum.DIGEST_KEY: {
      return <DigestKey />;
    }

    case UiComponentEnum.DIGEST_AMOUNT:
    case UiComponentEnum.DIGEST_UNIT:
    case UiComponentEnum.DIGEST_TYPE:
    case UiComponentEnum.DIGEST_CRON:
      return <DigestDelayTabs isDigest />;

    case UiComponentEnum.DELAY_AMOUNT:
    case UiComponentEnum.DELAY_UNIT:
    case UiComponentEnum.DELAY_TYPE:
    case UiComponentEnum.DELAY_CRON:
    case UiComponentEnum.DELAY_DYNAMIC_KEY:
      return <DelayWindow />;

    case UiComponentEnum.THROTTLE_TYPE:
    case UiComponentEnum.THROTTLE_WINDOW:
    case UiComponentEnum.THROTTLE_UNIT:
    case UiComponentEnum.THROTTLE_DYNAMIC_KEY:
      return <ThrottleWindow />;

    case UiComponentEnum.THROTTLE_THRESHOLD:
      return <ThrottleThreshold />;

    case UiComponentEnum.THROTTLE_KEY:
      return <ThrottleKey />;

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

    case UiComponentEnum.EMAIL_RENDERER_SELECT: {
      return <EmailRendererSelect />;
    }

    case UiComponentEnum.LAYOUT_SELECT: {
      return <LayoutSelect />;
    }

    case UiComponentEnum.EXTEND_TO_SCHEDULE: {
      return <ExtendToSchedule />;
    }

    default: {
      return null;
    }
  }
};
