import { UiSchemaGroupEnum, type UiSchema } from '@novu/shared';

import { Notification5Fill } from '@/components/icons';
import { Separator } from '@/components/primitives/separator';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { InAppTabsSection } from '@/components/workflow-editor/steps/in-app/in-app-tabs-section';

const avatarKey = 'avatar';
const subjectKey = 'subject';
const bodyKey = 'body';
const redirectKey = 'redirect';
const primaryActionKey = 'primaryAction';
const secondaryActionKey = 'secondaryAction';
const disableOutputSanitizationKey = 'disableOutputSanitization';

export const InAppEditor = ({ uiSchema }: { uiSchema: UiSchema }) => {
  if (uiSchema.group !== UiSchemaGroupEnum.IN_APP) {
    return null;
  }

  const {
    [avatarKey]: avatar,
    [subjectKey]: subject,
    [bodyKey]: body,
    [redirectKey]: redirect,
    [primaryActionKey]: primaryAction,
    [secondaryActionKey]: secondaryAction,
    [disableOutputSanitizationKey]: disableOutputSanitization,
  } = uiSchema.properties ?? {};

  return (
    <div className="flex flex-col">
      <InAppTabsSection className="flex flex-col gap-3">
        <div className={'flex items-center justify-between gap-2.5 text-sm font-medium'}>
          <div className="flex items-center gap-2.5">
            <Notification5Fill className="size-3" />
            <span>In-App template editor</span>
          </div>
          {disableOutputSanitization &&
            getComponentByType({
              component: disableOutputSanitization.component,
            })}
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-neutral-100 p-2">
          {(avatar || subject) && (
            <div className="flex gap-2">
              {avatar && getComponentByType({ component: avatar.component })}
              {subject && getComponentByType({ component: subject.component })}
            </div>
          )}
          {body && getComponentByType({ component: body.component })}
          {(primaryAction || secondaryAction) &&
            getComponentByType({
              component: primaryAction.component || secondaryAction.component,
            })}
        </div>
      </InAppTabsSection>

      {redirect && (
        <>
          <Separator className="before:bg-neutral-100" />
          <InAppTabsSection>
            {getComponentByType({
              component: redirect.component,
            })}
          </InAppTabsSection>
        </>
      )}
    </div>
  );
};
