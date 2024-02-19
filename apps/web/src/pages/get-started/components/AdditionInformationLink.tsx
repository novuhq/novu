import styled from '@emotion/styled';

import { colors, Text, OpenedBook } from '@novu/design-system';

import { Link } from '../consts/shared';
import { OnboardingUseCasesTabsEnum } from '../consts/OnboardingUseCasesTabsEnum';

interface IAdditionInformationLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  channel: OnboardingUseCasesTabsEnum;
}
export function AdditionInformationLink({ channel, ...linkProps }: IAdditionInformationLinkProps) {
  return (
    <StyledLink {...linkProps}>
      <OpenedBook />
      <StyledText>Learn about {channel}</StyledText>
    </StyledLink>
  );
}

const StyledLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: flex-start;
`;

const StyledText = styled(Text)`
  margin-left: 8px;
  color: ${colors.B60};
  line-height: 20px;
`;
