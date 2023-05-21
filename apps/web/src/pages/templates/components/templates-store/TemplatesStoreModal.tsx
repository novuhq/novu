import { useState } from 'react';
import { ReactFlowProvider } from 'react-flow-renderer';
import { ActionIcon, Modal, useMantineTheme } from '@mantine/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Button, colors, shadows } from '../../../../design-system';
import { Close } from '../../../../design-system/icons/actions/Close';
import {
  CanvasHolder,
  GroupName,
  MadeByNovuStyled,
  ModalBodyHolder,
  NovuButtonHolder,
  TemplateDetails,
  TemplateHeader,
  TemplateItem,
  TemplateName,
  TemplatesDetailsHolder,
  TemplatesGroup,
  TemplatesSidebarHolder,
  TemplateDescription,
  useStyles,
} from './templateStoreStyles';
import { IBlueprintsGrouped } from '../../../../api/hooks';
import { TriggerNode } from './TriggerNode';
import { ChannelNode } from './ChannelNode';
import { FlowEditor } from '../../../../components/workflow';

const nodeTypes = {
  triggerNode: TriggerNode,
  channelNode: ChannelNode,
};

export interface ITemplatesStoreModalProps {
  groupedBlueprints: IBlueprintsGrouped[];
  isOpened: boolean;
  onClose: () => void;
}

export const TemplatesStoreModal = ({ groupedBlueprints, isOpened, onClose }: ITemplatesStoreModalProps) => {
  const theme = useMantineTheme();
  const { classes: modalClasses } = useStyles();
  const [selectedTemplate, setTemplate] = useState(groupedBlueprints[0].templates[0]);

  return (
    <Modal
      opened={isOpened}
      withinPortal
      overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
      overlayOpacity={0.7}
      classNames={modalClasses}
      closeOnClickOutside={false}
      withCloseButton={false}
      lockScroll
      closeOnEscape
      sx={{ backdropFilter: 'blur(5px)' }}
      shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
      radius="md"
      size="lg"
      onClose={onClose}
    >
      <ModalBodyHolder>
        <TemplatesSidebarHolder>
          {groupedBlueprints.map((group) => (
            <TemplatesGroup key={group.name}>
              <GroupName>{group.name}</GroupName>
              {group.templates.map((template) => {
                return (
                  <TemplateItem key={template.name} onClick={() => setTemplate(template)}>
                    <FontAwesomeIcon icon={template.iconName} />
                    <span>{template.name}</span>
                  </TemplateItem>
                );
              })}
            </TemplatesGroup>
          ))}
        </TemplatesSidebarHolder>
        <TemplatesDetailsHolder>
          <TemplateHeader>
            <TemplateDetails>
              <TemplateName key={selectedTemplate.name}>
                <FontAwesomeIcon icon={selectedTemplate.iconName} />
                <span>{selectedTemplate.name}</span>
              </TemplateName>
              <TemplateDescription>{selectedTemplate.description}</TemplateDescription>
            </TemplateDetails>
            <ActionIcon variant="transparent" onClick={onClose}>
              <Close />
            </ActionIcon>
          </TemplateHeader>
          <CanvasHolder>
            <ReactFlowProvider>
              <FlowEditor
                steps={selectedTemplate.steps}
                nodeTypes={nodeTypes}
                zoomOnScroll={false}
                zoomOnPinch={false}
                zoomOnDoubleClick={false}
                panOnDrag={false}
                panOnScroll
                preventScrolling={false}
                nodesDraggable={false}
                elementsSelectable={false}
                nodesConnectable={false}
                selectNodesOnDrag={false}
                wrapperStyles={{
                  height: '100%',
                  width: '100%',
                  minHeight: '300px',
                }}
              />
            </ReactFlowProvider>
            <NovuButtonHolder>
              <MadeByNovuStyled width={104} height={20} />
              <Button>Use template</Button>
            </NovuButtonHolder>
          </CanvasHolder>
        </TemplatesDetailsHolder>
      </ModalBodyHolder>
    </Modal>
  );
};
