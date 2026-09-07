import { VALUE_TYPE_COLORS } from './constants';
import { SingleClickEditableValueProps } from './types';

export function SingleClickEditableValue({ value, setIsEditing, customNodeProps }: SingleClickEditableValueProps) {
  const { type } = customNodeProps || {};

  const handleClick = () => {
    setIsEditing?.(true);
  };

  const displayValue = type === 'string' ? `"${value}"` : String(value);
  const color = VALUE_TYPE_COLORS[type as keyof typeof VALUE_TYPE_COLORS] || VALUE_TYPE_COLORS.default;

  return (
    <span
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        color,
        fontWeight: type === 'boolean' ? '600' : 'normal',
      }}
      title="Click to edit"
    >
      {displayValue}
    </span>
  );
}
