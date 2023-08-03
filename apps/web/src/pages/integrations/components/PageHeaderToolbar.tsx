import styled from '@emotion/styled';
import { Button, Text } from '../../../design-system';
import { PlusFilled } from '../../../design-system/icons';

type PageHeaderToolbarProps = {
  isGradient?: boolean;
  label: string;
  onClick: (e: any) => void | VoidFunction;
  disabled?: boolean;
};

const ButtonStyled = styled(Button)`
  margin-left: -10px;
`;

export default function PageHeaderToolbar({
  label,
  isGradient = true,
  onClick,
  disabled = false,
}: PageHeaderToolbarProps) {
  return (
    <ButtonStyled id="add-provider" onClick={onClick} disabled={disabled} data-test-id="add-provider" variant="subtle">
      <PlusFilled width={24} height={24} />
      <Text gradient={isGradient}>{label}</Text>
    </ButtonStyled>
  );
}
