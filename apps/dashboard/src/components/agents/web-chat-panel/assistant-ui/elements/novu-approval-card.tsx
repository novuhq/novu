import type { ToolCallMessagePartComponent } from '@assistant-ui/react';
import { type AlwaysAllowOption, ApprovalCard, type ApprovalState } from './approval-card';

function commandPreview(args: unknown, argsText: string | undefined, toolName: string): string {
  if (argsText?.trim()) return argsText.trim();
  if (args && typeof args === 'object' && Object.keys(args as object).length > 0) {
    try {
      return JSON.stringify(args, null, 2);
    } catch {
      return toolName;
    }
  }

  return toolName;
}

function approvalState(approved: boolean | undefined, resolution: 'cancelled' | 'expired' | undefined): ApprovalState {
  if (resolution === 'cancelled' || resolution === 'expired' || approved === false) {
    return 'denied';
  }
  if (approved === undefined) return 'request';

  return 'done';
}

export const NovuApprovalCard: ToolCallMessagePartComponent = ({
  toolName,
  args,
  argsText,
  approval,
  respondToApproval,
}) => {
  const options = approval?.options ?? [];

  const respond = (optionId: string, approved: boolean) => {
    respondToApproval?.({ optionId, approved });
  };

  let onAllowOnce: (() => void) | undefined;
  let onDeny: (() => void) | undefined;
  const alwaysAllowOptions: AlwaysAllowOption[] = [];

  for (const option of options) {
    switch (option.kind) {
      case 'allow-once':
        onAllowOnce = () => respond(option.id, true);
        break;
      case 'allow-always':
        alwaysAllowOptions.push({
          label: option.label ?? 'Always allow',
          onSelect: () => respond(option.id, true),
        });
        break;
      case 'reject-once':
        onDeny = () => respond(option.id, false);
        break;
      default:
        break;
    }
  }

  return (
    <ApprovalCard
      state={approvalState(approval?.approved, approval?.resolution)}
      command={commandPreview(args, argsText, toolName)}
      title={toolName}
      subtitle="The agent wants to run this tool"
      onAllowOnce={onAllowOnce}
      alwaysAllowOptions={alwaysAllowOptions}
      onDeny={onDeny}
    />
  );
};
