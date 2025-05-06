import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { ChannelPreferencesForm } from './channel-preferences-form';

export function ChannelPreferences() {
  const { workflow, update } = useWorkflow();

  if (!workflow) {
    return null;
  }

  return <ChannelPreferencesForm workflow={workflow} update={update} />;
}
