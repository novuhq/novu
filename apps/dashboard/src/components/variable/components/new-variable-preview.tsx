import { VariablePreview } from './variable-preview';
import { Badge } from '../../primitives/badge';

interface INewVariablePreviewProps {
  onCreateClick?: () => void;
}

export function NewVariablePreview({ onCreateClick }: INewVariablePreviewProps) {
  return (
    <VariablePreview>
      <VariablePreview.Content>
        <div className="text-text-sub text-[10px] font-medium leading-normal">
          <Badge variant="lighter" color="orange" size="sm" className="mb-2">
            💡 TIP
          </Badge>
          <p>
            Adds a new string variable — use "Manage schema" to mark it required, change its type, or add validations.
          </p>
        </div>
      </VariablePreview.Content>
    </VariablePreview>
  );
}
