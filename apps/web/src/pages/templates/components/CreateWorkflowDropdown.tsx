import { useEffect } from 'react';
import { Skeleton } from '@mantine/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile } from '@fortawesome/free-regular-svg-icons';
import { faDiagramNext } from '@fortawesome/free-solid-svg-icons';
import styled from '@emotion/styled';

import { Dropdown, PlusButton, Popover } from '@novu/design-system';
import { FeatureFlagsKeysEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { Button } from '@novu/novui';
import { IconOutlineAdd } from '@novu/novui/icons';

import { IBlueprintTemplate } from '../../../api/types';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { useFeatureFlag, useHoverOverItem } from '../../../hooks';
import { FrameworkProjectDropDownItem } from './FrameworkProjectWaitList';
import { useDocsModal } from '../../../components/docs/useDocsModal';
import { PATHS } from '../../../components/docs/docs.const';

const WIDTH = 172;

const DropdownItemSkeleton = styled(Skeleton)`
  margin-bottom: 4px;
  width: 100%;
  height: 42px;
`;

export const CreateWorkflowDropdown = ({
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
  const isV2Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_ENABLED);
  const segment = useSegment();
  const { item: templateId, onMouseEnter, onMouseLeave } = useHoverOverItem<string>();
  const { toggle, setPath, Component } = useDocsModal();

  useEffect(() => {
    if (!isV2Enabled) {
      return;
    }
    setPath(PATHS.WORKFLOW_INTRODUCTION);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isV2Enabled]);

  if (isV2Enabled) {
    return (
      <>
        <Button onClick={toggle} Icon={IconOutlineAdd} variant="transparent">
          Add workflow
        </Button>
        <Component />
      </>
    );
  }

  return (
    <Dropdown
      position="bottom-start"
      disabled={readonly}
      withArrow={false}
      width={WIDTH}
      styles={{
        itemLabel: { textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' },
      }}
      control={
        <div>
          <PlusButton disabled={readonly} label="Add a workflow" data-test-id="create-workflow-btn" />
        </div>
      }
      data-test-id="create-workflow-dropdown"
    >
      <Dropdown.Item
        icon={<FontAwesomeIcon icon={faFile} />}
        onClick={(event) => {
          segment.track('[Template Store] Click Create Notification Template', {
            templateIdentifier: 'Blank Workflow',
            location: WorkflowCreationSourceEnum.DROPDOWN,
          });

          onBlankWorkflowClick(event);
        }}
        data-test-id="create-workflow-blank"
      >
        Blank workflow
      </Dropdown.Item>
      <FrameworkProjectDropDownItem />
      <Dropdown.Divider />
      {isLoading
        ? Array.from({ length: 3 }).map((_, index) => <DropdownItemSkeleton key={index} />)
        : blueprints?.map((template, index) => (
            <Popover
              key={template.name}
              opened={template._id === templateId && !!template.description}
              withArrow
              withinPortal
              offset={5}
              transitionDuration={300}
              position="left"
              width={300}
              styles={{ dropdown: { minHeight: 'auto !important' } }}
              target={
                <Dropdown.Item
                  disabled={isCreating}
                  icon={<FontAwesomeIcon icon={template.iconName} />}
                  onClick={() => {
                    segment.track('[Template Store] Click Create Notification Template', {
                      templateIdentifier: template?.triggers[0]?.identifier || '',
                      location: WorkflowCreationSourceEnum.DROPDOWN,
                    });

                    onTemplateClick(template);
                  }}
                  onMouseEnter={() => {
                    onMouseEnter(template._id);
                  }}
                  onMouseLeave={onMouseLeave}
                  data-test-id="create-template-dropdown-item"
                >
                  {template.name}
                </Dropdown.Item>
              }
              content={template.description}
            />
          ))}
      <Dropdown.Item
        disabled={allTemplatesDisabled}
        icon={<FontAwesomeIcon icon={faDiagramNext} />}
        onClick={(event) => {
          segment.track('[Template Store] Click Open Template Store', {
            location: WorkflowCreationSourceEnum.DROPDOWN,
          });

          onAllTemplatesClick(event);
        }}
        data-test-id="create-workflow-all-templates"
      >
        All templates
      </Dropdown.Item>
    </Dropdown>
  );
};
