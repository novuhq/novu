import { EnvironmentTypeEnum, type UiSchema } from '@novu/shared';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { useEnvironment } from '@/context/environment/hooks';
import { StepEditorUnavailable } from '../step-editor-unavailable';

type ChatEditorProps = { uiSchema: UiSchema };

export const ChatEditor = (props: ChatEditorProps) => {
  const { currentEnvironment } = useEnvironment();
  const { uiSchema } = props;
  const { body } = uiSchema?.properties ?? {};

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return <StepEditorUnavailable />;
  }

  return <div className="flex h-full flex-col">{getComponentByType({ component: body.component })}</div>;
};
