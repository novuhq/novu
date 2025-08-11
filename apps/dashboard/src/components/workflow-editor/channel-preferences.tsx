import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { ChannelPreferencesForm } from './channel-preferences-form';
import { useEnvironment } from '@/context/environment/hooks';
import { EnvironmentTypeEnum, ResourceOriginEnum } from '@novu/shared';

export function ChannelPreferences() {
  const { workflow, update } = useWorkflow();
  const { currentEnvironment } = useEnvironment();

  if (!workflow) {
    return null;
  }

  const isReadOnly =
    workflow.origin === ResourceOriginEnum.EXTERNAL || currentEnvironment?.type !== EnvironmentTypeEnum.DEV;

  return <ChannelPreferencesForm workflow={workflow} update={update} isReadOnly={isReadOnly} />;
}
