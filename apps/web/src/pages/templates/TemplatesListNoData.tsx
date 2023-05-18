import { useState } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconName } from '@fortawesome/fontawesome-svg-core';
import { faDiagramNext } from '@fortawesome/free-solid-svg-icons';
import { faFile } from '@fortawesome/free-regular-svg-icons';

import { colors, Popover, shadows } from '../../design-system';
import { Skeleton } from '@mantine/core';

const NoDataHolder = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 500px;
`;

const NoDataSubHeading = styled.p`
  margin: 0;
  font-size: 20px;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.B80)};
`;

const Card = styled.button`
  outline: none;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-width: 140px;
  width: 140px;
  height: 100px;
  border-radius: 8px;
  color: ${colors.B60};
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B20 : colors.B98)};
  box-shadow: ${shadows.dark};
  font-size: 14px;
  transition: all 0.25s ease;

  > svg {
    font-size: 20px;
  }

  &:disabled {
    cursor: not-allowed;
  }

  &:not(:disabled)&:hover {
    color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B60)};
    background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.BGLight)};
  }

  &[data-can-be-hidden='true'] {
    &:nth-last-of-type(2) {
      display: none;
    }

    @media screen and (min-width: 1369px) {
      &:nth-last-of-type(2) {
        display: flex;
      }
    }
  }

  @media screen and (min-width: 1025px) {
    min-width: 160px;
    width: 160px;
    height: 120px;

    > svg {
      font-size: 24px;
    }
  }
`;

const CardsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin: 50px 20px;

  @media screen and (min-width: 1025px) {
    gap: 24px;
    margin: 50px 40px;
  }
`;

const SkeletonIcon = styled(Skeleton)`
  min-width: 24px;
  width: 24px;
  height: 24px;

  @media screen and (min-width: 1025px) {
    min-width: 28px;
    width: 28px;
    height: 28px;
  }
`;

export const TemplatesListNoData = ({
  blueprints,
  isLoading,
  allTemplatesDisabled,
  onBlankWorkflowClick,
  onTemplateClick,
  onAllTemplatesClick,
}: {
  blueprints?: { id: string; name: string; description: string; iconName: IconName }[];
  isLoading?: boolean;
  allTemplatesDisabled?: boolean;
  onBlankWorkflowClick: React.MouseEventHandler<HTMLButtonElement>;
  onTemplateClick: (template: { id: string; name: string; description: string; iconName: IconName }) => void;
  onAllTemplatesClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  const [templateId, setTemplateId] = useState<string | null>(null);

  return (
    <NoDataHolder data-test-id="no-workflow-templates-placeholder">
      <NoDataSubHeading>Start from a blank workflow or use a template</NoDataSubHeading>
      <CardsContainer>
        <Card data-test-id="create-workflow-tile" onClick={onBlankWorkflowClick}>
          <FontAwesomeIcon icon={faFile} />
          <span>Blank Workflow</span>
        </Card>
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} data-can-be-hidden={index === 2} data-test-id="second-workflow-tile">
                <SkeletonIcon />
                <Skeleton height={14} width="100%" />
              </Card>
            ))
          : blueprints?.map((template, index) => (
              <Popover
                key={template.name}
                opened={template.id === templateId}
                withArrow
                withinPortal
                offset={5}
                transitionDuration={300}
                position="top"
                width={300}
                target={
                  <Card
                    data-can-be-hidden={index === 2}
                    data-test-id="second-workflow-tile"
                    onClick={() => onTemplateClick(template)}
                    onMouseEnter={() => {
                      setTemplateId(template.id);
                    }}
                    onMouseLeave={() => {
                      setTemplateId(null);
                    }}
                  >
                    <FontAwesomeIcon icon={template.iconName} />
                    <span>{template.name}</span>
                  </Card>
                }
                content={template.description}
              />
            ))}
        <Card data-test-id="all-workflow-tile" onClick={onAllTemplatesClick} disabled={allTemplatesDisabled}>
          <FontAwesomeIcon icon={faDiagramNext} />
          <span>All templates</span>
        </Card>
      </CardsContainer>
    </NoDataHolder>
  );
};
