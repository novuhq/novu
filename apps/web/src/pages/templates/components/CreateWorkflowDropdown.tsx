import { useState } from 'react';
import { Skeleton } from '@mantine/core';
import { IconName } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile } from '@fortawesome/free-regular-svg-icons';
import { faDiagramNext } from '@fortawesome/free-solid-svg-icons';
import styled from '@emotion/styled';

import { Button, Dropdown, Popover } from '../../../design-system';
import { PlusCircle } from '../../../design-system/icons';

const WIDTH = 172;

const ButtonStyled = styled(Button)`
  width: ${WIDTH}px;
`;

const DropdownItemSkeleton = styled(Skeleton)`
  margin-bottom: 4px;
  width: 100%;
  height: 42px;
`;

export const CreateWorkflowDropdown = ({
  readonly,
  blueprints,
  isLoading,
  allTemplatesDisabled,
  onBlankWorkflowClick,
  onTemplateClick,
  onAllTemplatesClick,
}: {
  readonly?: boolean;
  blueprints?: { id: string; name: string; description: string; iconName: IconName }[];
  isLoading?: boolean;
  allTemplatesDisabled?: boolean;
  onBlankWorkflowClick: React.MouseEventHandler<HTMLButtonElement>;
  onTemplateClick: (template: { id: string; name: string; description: string; iconName: IconName }) => void;
  onAllTemplatesClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  const [templateId, setTemplateId] = useState<string | null>(null);

  return (
    <Dropdown
      position="bottom"
      disabled={readonly}
      withArrow={false}
      width={WIDTH}
      styles={{
        itemLabel: { textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' },
      }}
      control={
        <div>
          <ButtonStyled disabled={readonly} icon={<PlusCircle />} data-test-id="create-template-btn">
            Create Workflow
          </ButtonStyled>
        </div>
      }
      data-test-id="create-template-dropdown"
    >
      {isLoading
        ? Array.from({ length: 3 }).map((_, index) => <DropdownItemSkeleton key={index} />)
        : blueprints?.map((template, index) => (
            <Popover
              key={template.name}
              opened={template.id === templateId}
              withArrow
              withinPortal
              offset={5}
              transitionDuration={300}
              position="left"
              width={300}
              target={
                <Dropdown.Item
                  icon={<FontAwesomeIcon icon={template.iconName} />}
                  onClick={() => onTemplateClick(template)}
                  onMouseEnter={() => {
                    setTemplateId(template.id);
                  }}
                  onMouseLeave={() => {
                    setTemplateId(null);
                  }}
                  data-test-id="logout-button"
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
        onClick={onAllTemplatesClick}
        data-test-id="create-workfolow-all-templates"
      >
        All templates
      </Dropdown.Item>
      <Dropdown.Divider />
      <Dropdown.Item
        icon={<FontAwesomeIcon icon={faFile} />}
        onClick={onBlankWorkflowClick}
        data-test-id="create-workfolow-blank"
      >
        Blank workflow
      </Dropdown.Item>
    </Dropdown>
  );
};
