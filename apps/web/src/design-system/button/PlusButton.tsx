import styled from '@emotion/styled';

import { Button, IButtonProps } from './Button';
import { Text } from '../typography/text/Text';
import { PlusFilled } from '../icons';

interface PlusButtonProps extends IButtonProps {
  isGradient?: boolean;
  label: string;
}

const ButtonStyled = styled(Button)`
  padding: 0;
`;

export function PlusButton({ label, isGradient = true, onClick, disabled = false, ...rest }: PlusButtonProps) {
  return (
    <ButtonStyled id="add-provider" onClick={onClick} disabled={disabled} variant="subtle" {...rest}>
      <PlusFilled width={24} height={24} />
      <Text gradient={isGradient}>{label}</Text>
    </ButtonStyled>
  );
}
