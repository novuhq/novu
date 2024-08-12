import styled from '@emotion/styled';
import { colors, JavaScriptLogo, ReactLogo, Text } from '@novu/design-system';
import { UTM_CAMPAIGN_QUERY_PARAM } from '@novu/shared';

import { FrameworkEnum } from '../../../quick-start/consts';

const NovuInAppFrameworksHolder = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FrameworksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 16px;
`;

const frameworkHolderStyles = (theme) => `
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1 0 0;
  padding: 16px;
  border-radius: 8px;
  background: ${theme.colorScheme === 'dark' ? colors.B20 : colors.BGLight};
  cursor: pointer;
  user-select: none;
  transition: all 250ms ease-in-out;

  &:hover {
    filter: ${theme.colorScheme === 'dark' ? 'brightness(1.1)' : 'brightness(0.95)'};
  }
`;

const FrameworkHolder = styled.div`
  ${({ theme }) => frameworkHolderStyles(theme)};
`;

const FrameworkHolderLink = styled.a`
  ${({ theme }) => frameworkHolderStyles(theme)};
`;

const frameworks = [
  { icon: ReactLogo, name: 'React', frameworkEnum: FrameworkEnum.REACT },
  {
    icon: JavaScriptLogo,
    name: 'Headless',
    href: `https://docs.novu.co/inbox/introduction${UTM_CAMPAIGN_QUERY_PARAM}`,
  },
];

export const NovuInAppFrameworks = ({ onFrameworkClick }: { onFrameworkClick: (framework: FrameworkEnum) => void }) => {
  return (
    <NovuInAppFrameworksHolder data-test-id="novu-in-app-frameworks">
      <Text>Integrate Inbox using a framework below</Text>
      <FrameworksGrid>
        {frameworks.map(({ name, icon: Icon, frameworkEnum, href }) =>
          frameworkEnum ? (
            <FrameworkHolder
              key={name}
              onClick={() => {
                onFrameworkClick(frameworkEnum);
              }}
            >
              <Icon />
              <Text>{name}</Text>
            </FrameworkHolder>
          ) : (
            <FrameworkHolderLink key={name} href={href} rel="noreferrer" target="_blank">
              <Icon />
              <Text>{name}</Text>
            </FrameworkHolderLink>
          )
        )}
      </FrameworksGrid>
    </NovuInAppFrameworksHolder>
  );
};
