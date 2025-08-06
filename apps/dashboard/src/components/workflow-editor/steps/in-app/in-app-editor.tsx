import { EnvironmentTypeEnum, type UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { RiInstanceLine } from 'react-icons/ri';
import { Notification5Fill } from '@/components/icons';
import { Separator } from '@/components/primitives/separator';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { InAppTabsSection } from '@/components/workflow-editor/steps/in-app/in-app-tabs-section';
import { useEnvironment } from '@/context/environment/hooks';

import { cn } from '../../../../utils/ui';
import { StepEditorUnavailable } from '../step-editor-unavailable';

const avatarKey = 'avatar';
const subjectKey = 'subject';
const bodyKey = 'body';
const redirectKey = 'redirect';
const primaryActionKey = 'primaryAction';
const secondaryActionKey = 'secondaryAction';
const disableOutputSanitizationKey = 'disableOutputSanitization';
const dataObjectKey = 'data';

export const InAppEditor = ({ uiSchema }: { uiSchema: UiSchema }) => {
  const { currentEnvironment } = useEnvironment();

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
    [dataObjectKey]: dataObject,
  } = uiSchema.properties ?? {};

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return <StepEditorUnavailable />;
  }

  return (
    <div className="flex flex-col">
      <InAppTabsSection className="flex flex-col gap-3 p-0 pb-3">
        <div className="flex flex-col gap-2 rounded-xl border border-neutral-100 p-2 bg-bg-weak">
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
        <InAppTabsSection className="pt-0 p-0 pb-3">
          {getComponentByType({
            component: redirect.component,
          })}
        </InAppTabsSection>
      )}

      <div className="ml-auto flex items-center justify-between gap-2.5 pb-3 text-sm font-medium">
        {disableOutputSanitization &&
          getComponentByType({
            component: disableOutputSanitization.component,
          })}
      </div>

      {dataObject && (
        <>
          <Separator />
          <InAppTabsSection className="px-0 pb-0">
            <div className="flex items-center gap-2.5 text-sm">
              <RiInstanceLine className="size-4" />
              <span>Developers</span>
            </div>
          </InAppTabsSection>
        </>
      )}

      {dataObject && (
        <>
          <InAppTabsSection className="px-0 pb-3">
            {getComponentByType({
              component: dataObject.component,
            })}
          </InAppTabsSection>
        </>
      )}
    </div>
  );
};
