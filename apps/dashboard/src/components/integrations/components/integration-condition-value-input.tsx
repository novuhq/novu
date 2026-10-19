import type { ConditionsValueInput } from '@/components/conditions-editor/types';
import { InputPure } from '@/components/primitives/input';

/**
 * Integration conditions compare against literal values with integration-specific sizing.
 */
export const IntegrationConditionValueInput: ConditionsValueInput = ({ value, onChange, placeholder, disabled }) => {
  return (
    <InputPure
      className="text-paragraph-xs h-7 px-2"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};
