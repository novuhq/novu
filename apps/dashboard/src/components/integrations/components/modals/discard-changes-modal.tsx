import { RiErrorWarningFill } from 'react-icons/ri';
import { DrawerConfirmDialog } from './drawer-confirm-dialog';

/** "Name", "Name and API Key", "Name, API Key and 2 other fields". */
function listFields(fields: string[]) {
  if (fields.length === 0) return 'this integration';
  if (fields.length === 1) return fields[0];
  if (fields.length === 2) return `${fields[0]} and ${fields[1]}`;
  const others = fields.length - 2;

  return `${fields[0]}, ${fields[1]} and ${others} other ${others === 1 ? 'field' : 'fields'}`;
}

type DiscardChangesModalProps = {
  isOpen: boolean;
  /** Labels of the edited fields, as the form shows them. */
  changedFields: string[];
  environmentName?: string;
  /** What leaving does, finishing "If you … now": "close the drawer", "switch to Production". */
  action: string;
  onKeepEditing: () => void;
  onDiscard: () => void;
};

/** Asks before unsaved edits in the manage integration drawer are thrown away. */
export function DiscardChangesModal({
  isOpen,
  changedFields,
  environmentName,
  action,
  onKeepEditing,
  onDiscard,
}: DiscardChangesModalProps) {
  const where = environmentName ? ` in ${environmentName}` : '';
  const loss = changedFields.length > 1 ? 'the changes are lost' : 'the change is lost';

  return (
    <DrawerConfirmDialog
      isOpen={isOpen}
      icon={<RiErrorWarningFill className="size-[18px]" />}
      iconTileClassName="bg-warning-base/10 text-warning-base"
      title="Discard unsaved changes?"
      description={`You changed ${listFields(changedFields)}${where}. If you ${action} now, ${loss}.`}
      cancelLabel="Keep editing"
      confirmLabel="Discard changes"
      confirmVariant="error"
      onCancel={onKeepEditing}
      onConfirm={onDiscard}
    />
  );
}
