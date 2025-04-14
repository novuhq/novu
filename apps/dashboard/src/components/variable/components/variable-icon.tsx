import { Code2 } from '@/components/icons/code-2';
import { RepeatVariable } from '@/components/icons/repeat-variable';
import { REPEAT_BLOCK_ITERABLE_ALIAS } from '@/components/workflow-editor/steps/email/variables/variables';

export const VariableIcon = ({ variableName }: { variableName: string }) => {
  if (variableName && variableName.startsWith(REPEAT_BLOCK_ITERABLE_ALIAS)) {
    return <RepeatVariable className="text-feature size-3.5 min-w-3.5" />;
  }

  return <Code2 className="text-feature size-3.5 min-w-3.5" />;
};
