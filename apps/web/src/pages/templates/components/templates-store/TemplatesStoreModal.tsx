import { useState } from 'react';
import { ReactFlowProvider } from 'react-flow-renderer';
import { ActionIcon, Modal, useMantineTheme } from '@mantine/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import { Button, colors, shadows, Close } from '@novu/design-system';
import { faFile } from '@fortawesome/free-regular-svg-icons';
import { INotificationTemplateStep } from '@novu/shared';

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
import { useCreateTemplateFromBlueprint } from '../../../../api/hooks';
import { errorMessage } from '../../../../utils/notifications';
import { parseUrl } from '../../../../utils/routeUtils';
import { ROUTES } from '../../../../constants/routes.enum';
import { TemplateCreationSourceEnum } from '../../shared';
import { useSegment } from '../../../../components/providers/SegmentProvider';
import { IBlueprintTemplate } from '../../../../api/types';
import { TemplateAnalyticsEnum } from '../../constants';
import { EchoProjectModalItem } from '../EchoProjectWaitList';

const nodeTypes = {
  triggerNode: TriggerNode,
  channelNode: ChannelNode,
};

export interface ITemplatesStoreModalProps {
  general: IBlueprintsGrouped[];
  popular: IBlueprintsGrouped[];
  isOpened: boolean;
  onClose: () => void;
}

export const TemplatesStoreModal = ({ general, popular, isOpened, onClose }: ITemplatesStoreModalProps) => {
  const theme = useMantineTheme();
  const { classes: modalClasses } = useStyles();
  const navigate = useNavigate();
  const [selectedTemplate, setTemplate] = useState(general[0].blueprints[0]);

  const { createTemplateFromBlueprint, isLoading: isCreatingTemplateFromBlueprint } = useCreateTemplateFromBlueprint({
    onSuccess: (template) => {
      navigate(`${parseUrl(ROUTES.WORKFLOWS_EDIT_TEMPLATEID, { templateId: template._id ?? '' })}`);
    },
    onError: () => {
      errorMessage('Something went wrong while creating template from blueprint, please try again later.');
    },
  });

  const segment = useSegment();

  const handleTemplateClick = (template: IBlueprintTemplate) => {
    segment.track('[Template Store] Click Notification Template', {
      templateIdentifier: template.triggers[0]?.identifier,
      location: TemplateCreationSourceEnum.TEMPLATE_STORE,
    });

    setTemplate(template);
  };

  const handleRedirectToCreateBlankTemplate = (isFromHeader: boolean) => {
    segment.track(TemplateAnalyticsEnum.CREATE_TEMPLATE_CLICK, { isFromHeader });
    navigate(ROUTES.WORKFLOWS_CREATE);
  };

  const handleCreateTemplateClick = (blueprint: IBlueprintTemplate) => {
    segment.track('[Template Store] Click Create Notification Template', {
      templateIdentifier: blueprint.triggers[0]?.identifier,
      location: TemplateCreationSourceEnum.TEMPLATE_STORE,
    });

    createTemplateFromBlueprint({
      blueprint: blueprint,
      params: { __source: TemplateCreationSourceEnum.TEMPLATE_STORE },
    });
  };

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
      <ModalBodyHolder data-test-id="templates-store-modal">
        <TemplatesSidebarHolder data-test-id="templates-store-modal-sidebar">
          <TemplatesGroup key="blank-workflow">
            <GroupName>Workflow</GroupName>
            <TemplateItem
              key="temp-blank-workflow"
              onClick={() => {
                segment.track('[Template Store] Click Create Notification Template', {
                  templateIdentifier: 'Blank Workflow',
                  location: TemplateCreationSourceEnum.DROPDOWN,
                });
                handleRedirectToCreateBlankTemplate(false);
              }}
            >
              <FontAwesomeIcon icon={faFile} />
              <span>Blank Workflow</span>
            </TemplateItem>
            <EchoProjectModalItem />
          </TemplatesGroup>

          {popular.map((group) => (
            <TemplatesGroup key={group.name}>
              <GroupName>{group.name}</GroupName>
              {group.blueprints.map((template) => {
                return (
                  <TemplateItem key={template.name} onClick={() => handleTemplateClick(template)}>
                    <FontAwesomeIcon icon={template.iconName} />
                    <span>{template.name}</span>
                  </TemplateItem>
                );
              })}
            </TemplatesGroup>
          ))}
          {general.map((group) => (
            <TemplatesGroup key={group.name}>
              <GroupName>{group.name}</GroupName>
              {group.blueprints.map((template) => {
                return (
                  <TemplateItem
                    key={template.name}
                    onClick={() => handleTemplateClick(template)}
                    data-test-id="templates-store-modal-blueprint-item"
                  >
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
              <TemplateName key={selectedTemplate.name} data-test-id="templates-store-modal-blueprint-name">
                <FontAwesomeIcon icon={selectedTemplate.iconName} />
                <span>{selectedTemplate.name}</span>
              </TemplateName>
              <TemplateDescription data-test-id="templates-store-modal-blueprint-description">
                {selectedTemplate.description}
              </TemplateDescription>
            </TemplateDetails>
            <ActionIcon variant="transparent" onClick={onClose} sx={{ marginLeft: 'auto' }}>
              <Close />
            </ActionIcon>
          </TemplateHeader>
          <CanvasHolder>
            <ReactFlowProvider>
              <FlowEditor
                key={selectedTemplate._id}
                steps={selectedTemplate.steps as INotificationTemplateStep[]}
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
                data-template-store-editor
              />
            </ReactFlowProvider>
            <NovuButtonHolder>
              <MadeByNovuStyled width={104} height={20} />
              <Button
                disabled={isCreatingTemplateFromBlueprint}
                loading={isCreatingTemplateFromBlueprint}
                onClick={() => {
                  handleCreateTemplateClick(selectedTemplate);
                }}
                data-test-id="templates-store-modal-use-template"
              >
                Use template
              </Button>
            </NovuButtonHolder>
          </CanvasHolder>
        </TemplatesDetailsHolder>
      </ModalBodyHolder>
    </Modal>
  );
};
