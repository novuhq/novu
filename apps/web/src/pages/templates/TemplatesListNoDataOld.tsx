import styled from '@emotion/styled';

import { Cards, colors, Text, PageGradient, DigestGradient } from '@novu/design-system';

const NoDataHolder = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 500px;
`;

const NoDataHeading = styled.h2`
  font-size: 28px;
  font-weight: bold;
  color: ${colors.B40};
`;

const NoDataSubHeading = styled.p`
  margin: 0;
  font-size: 20px;
  color: ${colors.B40};
`;

const CardsContainer = styled.div`
  display: flex;
  gap: 40px;
  margin: 50px 40px;
`;

export const TemplatesListNoDataOld = ({
  onCreateClick,
  onTryDigestClick,
  tryDigestDisabled,
}: {
  onCreateClick: React.MouseEventHandler<HTMLButtonElement>;
  onTryDigestClick: React.MouseEventHandler<HTMLButtonElement>;
  tryDigestDisabled: boolean;
}) => {
  return (
    <NoDataHolder data-test-id="no-workflow-templates-placeholder">
      <NoDataHeading>You don't have a workflow yet,</NoDataHeading>
      <NoDataSubHeading>Start from scratch or play around with the Digest Demo Playground</NoDataSubHeading>
      <CardsContainer>
        <Cards
          cells={[
            {
              navIcon: PageGradient,
              description: (
                <Text size="lg" weight="bold">
                  Create Workflow
                </Text>
              ),
              onClick: onCreateClick,
              testId: 'create-workflow-tile',
            },
            {
              navIcon: DigestGradientIcon,
              description: (
                <Text size="lg" weight="bold">
                  Try the Digest Playground
                </Text>
              ),
              onClick: onTryDigestClick,
              disabled: tryDigestDisabled,
              testId: 'try-digest-playground-tile',
            },
          ]}
        />
      </CardsContainer>
    </NoDataHolder>
  );
};

const DigestGradientIcon = () => <DigestGradient style={{ height: '40px', width: '40px' }} />;
