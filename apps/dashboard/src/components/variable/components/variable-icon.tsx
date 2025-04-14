import { Code2 } from '@/components/icons/code-2';
import { DigestVariableIcon } from '@/components/icons/digest-variable-icon';
import { DIGEST_PREVIEW_MAP } from '../utils/digest-variables';

export const VariableIcon = ({ variableName }: { variableName: string }) => {
  if (variableName in DIGEST_PREVIEW_MAP) {
    return <DigestVariableIcon className="text-feature size-3.5 min-w-3.5" />;
  }

  return <Code2 className="text-feature size-3.5 min-w-3.5" />;
};
