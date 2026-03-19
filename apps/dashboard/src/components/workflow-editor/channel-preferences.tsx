import { EnvironmentTypeEnum, ResourceOriginEnum } from '@novu/shared';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { ChannelPreferencesForm } from './channel-preferences-form';

export function ChannelPreferences() {
  const { workflow, update } = useWorkflow();
  const { currentEnvironment } = useEnvironment();

  if (!workflow) {
    return null;
  }

  const isReadOnly = currentEnvironment?.type !== EnvironmentTypeEnum.DEV;

  return <ChannelPreferencesForm workflow={workflow} update={update} isReadOnly={isReadOnly} />;
}
