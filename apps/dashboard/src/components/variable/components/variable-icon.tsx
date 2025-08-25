import { TRANSLATION_NAMESPACE_SEPARATOR } from '@novu/shared';
import { RiErrorWarningLine } from 'react-icons/ri';
import { Code2 } from '@/components/icons/code-2';
import { DigestVariableIcon } from '@/components/icons/digest-variable-icon';
import { RepeatVariable } from '@/components/icons/repeat-variable';
import { TranslateVariableIcon } from '@/components/icons/translate-variable';
import { REPEAT_BLOCK_ITERABLE_ALIAS } from '@/components/maily/repeat-block-aliases';
import { DIGEST_PREVIEW_MAP } from '@/components/variable/utils/digest-variables';

export const VariableIcon = ({
  variableName,
  hasError,
  isNotInSchema,
  context = 'variables',
}: {
  variableName: string;
  hasError?: boolean;
  isNotInSchema?: boolean;
  context?: 'variables' | 'translations';
}) => {
  if (hasError) {
    return <RiErrorWarningLine className="text-error-base size-3.5 min-w-3.5" />;
  }

  if (isNotInSchema) {
    return <RiErrorWarningLine className="text-error-base size-3.5 min-w-3.5" />;
  }

  if (context === 'translations' || variableName === TRANSLATION_NAMESPACE_SEPARATOR) {
    return <TranslateVariableIcon className="text-feature size-3.5 min-w-3.5" />;
  }

  if (variableName && variableName in DIGEST_PREVIEW_MAP) {
    return <DigestVariableIcon className="text-feature size-3.5 min-w-3.5" />;
  }

  if (variableName && variableName.startsWith(REPEAT_BLOCK_ITERABLE_ALIAS)) {
    return <RepeatVariable className="text-feature size-3.5 min-w-3.5" />;
  }

  return <Code2 className="text-feature size-3.5 min-w-3.5" />;
};
