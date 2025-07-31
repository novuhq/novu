import { Badge } from '../../primitives/badge';
import { VariablePreview } from './variable-preview';

interface INewVariablePreviewProps {
  onCreateClick?: () => void;
}

export function NewVariablePreview({ onCreateClick }: INewVariablePreviewProps) {
  return (
    <VariablePreview className="min-w-[200px]">
      <VariablePreview.Content>
        <div className="text-text-sub text-[10px] font-medium leading-normal">
          <Badge variant="lighter" color="orange" size="sm" className="mb-2">
            💡 TIP
          </Badge>
          <p>
            Adds a new string variable — use "Manage schema" to mark it required, change its type, or add validations.
          </p>

          {onCreateClick && (
            <a
              href="#"
              onClick={onCreateClick}
              className="text-text-sub mt-2 block text-[10px] font-medium leading-normal underline"
            >
              Insert & manage schema ↗
            </a>
          )}
        </div>
      </VariablePreview.Content>
    </VariablePreview>
  );
}
