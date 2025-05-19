import { LinkButton } from '@/components/primitives/button-link';
import { VariablePreview } from './variable-preview';

export function NewVariablePreview() {
  return (
    <VariablePreview>
      <VariablePreview.Description>
        <p className="text-text-sub text-2xs mb-2">
          Adds a new string variable to the Payload Schema. You can later configure the new variable in the Schema
          Manager.
        </p>
        <LinkButton variant="modifiable" size="sm">
          Create & change defaults
        </LinkButton>
      </VariablePreview.Description>
    </VariablePreview>
  );
}
