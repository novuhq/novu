import { Text } from '@novu/novui';
import { css } from '@novu/novui/css';

export function TextElement({ children }) {
  return <Text className={css({ color: 'typography.text.secondary' })}>{children}</Text>;
}
