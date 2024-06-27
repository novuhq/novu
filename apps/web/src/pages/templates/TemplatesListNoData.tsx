import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiagramNext } from '@fortawesome/free-solid-svg-icons';
import { faFile } from '@fortawesome/free-regular-svg-icons';
import { Skeleton } from '@mantine/core';
import { CardTile, colors, Popover } from '@novu/design-system';

import { useSegment } from '../../components/providers/SegmentProvider';
import { IBlueprintTemplate } from '../../api/types';
import { TemplateCreationSourceEnum } from './shared';
import { useFeatureFlag, useHoverOverItem } from '../../hooks';
import { EchoProjectCardTile } from './components/EchoProjectWaitList';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { When } from '../../components/utils/When';

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

const CardsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
  margin: 50px 20px;

  @media screen and (min-width: 1025px) {
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
  readonly,
  blueprints,
  isLoading,
  isCreating,
  allTemplatesDisabled,
  onBlankWorkflowClick,
  onTemplateClick,
  onAllTemplatesClick,
}: {
  readonly?: boolean;
  blueprints?: IBlueprintTemplate[];
  isLoading?: boolean;
  isCreating?: boolean;
  allTemplatesDisabled?: boolean;
  onBlankWorkflowClick: React.MouseEventHandler<HTMLButtonElement>;
  onTemplateClick: (template: IBlueprintTemplate) => void;
  onAllTemplatesClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  const segment = useSegment();
  const { item: templateId, onMouseEnter, onMouseLeave } = useHoverOverItem<string>();
  const isV2Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_ENABLED);

  return (
    <NoDataHolder data-test-id="no-workflow-templates-placeholder">
      <When truthy={!isV2Enabled}>
        <NoDataSubHeading>Start from a blank workflow or use a template</NoDataSubHeading>
      </When>
      <When truthy={isV2Enabled}>
        <NoDataSubHeading>Create a new workflow</NoDataSubHeading>
      </When>
      <CardsContainer>
        <When truthy={!isV2Enabled}>
          <CardTile
            disabled={readonly}
            data-test-id="create-workflow-tile"
            onClick={(event) => {
              segment.track('[Template Store] Click Create Notification Template', {
                templateIdentifier: 'Blank Workflow',
                location: TemplateCreationSourceEnum.EMPTY_STATE,
              });

              onBlankWorkflowClick(event);
            }}
          >
            <FontAwesomeIcon icon={faFile} />
            <span>Blank Workflow</span>
          </CardTile>
        </When>
        <EchoProjectCardTile />
        <When truthy={!isV2Enabled}>
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <CardTile key={index} data-can-be-hidden={index === 2} data-test-id="second-workflow-tile">
                  <SkeletonIcon />
                  <Skeleton height={14} width="100%" />
                </CardTile>
              ))
            : blueprints?.map((template, index) => (
                <Popover
                  key={template.name}
                  opened={template._id === templateId && !!template.description}
                  withArrow
                  withinPortal
                  offset={5}
                  transitionDuration={300}
                  position="top"
                  width={300}
                  styles={{ dropdown: { minHeight: 'auto !important' } }}
                  target={
                    <CardTile
                      data-can-be-hidden={index === 2}
                      data-test-id="popular-workflow-tile"
                      disabled={readonly || isCreating}
                      onClick={() => {
                        segment.track('[Template Store] Click Create Notification Template', {
                          templateIdentifier: template?.triggers[0]?.identifier || '',
                          location: TemplateCreationSourceEnum.EMPTY_STATE,
                        });

                        onTemplateClick(template);
                      }}
                      onMouseEnter={() => {
                        onMouseEnter(template._id);
                      }}
                      onMouseLeave={onMouseLeave}
                    >
                      <FontAwesomeIcon icon={template.iconName} />
                      <span>{template.name}</span>
                    </CardTile>
                  }
                  content={template.description}
                />
              ))}
          <CardTile
            data-test-id="all-workflow-tile"
            onClick={(event) => {
              segment.track('[Template Store] Click Open Template Store', {
                location: TemplateCreationSourceEnum.EMPTY_STATE,
              });

              onAllTemplatesClick(event);
            }}
            disabled={allTemplatesDisabled || readonly}
          >
            <FontAwesomeIcon icon={faDiagramNext} />
            <span>All templates</span>
          </CardTile>
        </When>
      </CardsContainer>
    </NoDataHolder>
  );
};
