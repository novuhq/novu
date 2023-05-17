/* eslint-disable max-len */
/* cSpell:disable */
import { useState } from 'react';
import { ReactFlowProvider } from 'react-flow-renderer';
import { ActionIcon, Modal, useMantineTheme } from '@mantine/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconName } from '@fortawesome/fontawesome-svg-core';

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
import FlowEditor from '../../workflow/workflow/FlowEditor';
import { StepTypeEnum } from '@novu/shared';
import { TriggerNode } from './TriggerNode';
import { ChannelNode } from './ChannelNode';
import { IFormStep } from '../formTypes';

const STEPS: IFormStep[] = [
  {
    _id: 'digest',
    name: 'Digest',
    template: {
      type: StepTypeEnum.DIGEST,
      content: '',
    },
  },
  {
    _id: 'email',
    name: 'Email',
    template: {
      name: 'Test email',
      subject: 'Test subject',
      title: 'Test title',
      type: StepTypeEnum.EMAIL,
      content: 'adsf',
    },
  },
];

const STEPS2: IFormStep[] = [
  {
    _id: 'in-app',
    name: 'In-App',
    template: {
      type: StepTypeEnum.IN_APP,
      content: '',
    },
  },
  {
    _id: 'digest',
    name: 'Digest',
    template: {
      type: StepTypeEnum.DIGEST,
      content: '',
    },
  },
  {
    _id: 'email',
    name: 'Email',
    template: {
      name: 'Test email',
      type: StepTypeEnum.EMAIL,
      content: 'adsf',
    },
  },
  {
    _id: 'push',
    name: 'Push',
    template: {
      type: StepTypeEnum.PUSH,
      content: 'Test push',
    },
  },
];

const TEMPLATES_GROUPED = [
  {
    name: 'Collaboration',
    templates: [
      {
        name: ':fa-regular fa-message: Comments',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
        steps: STEPS,
      },
      {
        name: ':fa-solid fa-user-check: Mentions',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
        steps: STEPS2,
      },
      {
        name: ':fa-solid fa-reply: Reply',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
        steps: STEPS,
      },
    ],
  },
  {
    name: 'Growth',
    templates: [
      {
        name: ':fa-regular fa-hand: Welcome message',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
        steps: STEPS,
      },
      {
        name: ':fa-solid fa-envelope-open-text: Invite message',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
        steps: STEPS2,
      },
      {
        name: ':fa-solid fa-gift: Refferal link',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
        steps: STEPS,
      },
    ],
  },
  {
    name: 'Authentification',
    templates: [
      {
        name: ':fa-solid fa-wand-magic-sparkles: Magic link',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
        steps: STEPS,
      },
      {
        name: ':fa-solid fa-unlock: Password change',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
        steps: STEPS,
      },
      {
        name: ':fa-solid fa-unlock: Password change2',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
        steps: STEPS,
      },
      {
        name: ':fa-solid fa-unlock: Password change3',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
        steps: STEPS,
      },
    ],
  },
];

const getTemplateDetails = (templateName: string): { name: string; iconName: IconName } => {
  const regexResult = /^:.{1,}: /.exec(templateName);
  let name = '';
  let iconName = 'fa-solid fa-question';
  if (regexResult !== null) {
    name = templateName.replace(regexResult[0], '').trim();
    iconName = regexResult[0].replace(/:/g, '').trim();
  }

  return { name, iconName: iconName as IconName };
};

const nodeTypes = {
  triggerNode: TriggerNode,
  channelNode: ChannelNode,
};

export interface ITemplatesStoreModalProps {
  isOpened: boolean;
  onClose: () => void;
}

export const TemplatesStoreModal = ({ isOpened, onClose }: ITemplatesStoreModalProps) => {
  const theme = useMantineTheme();
  const { classes: modalClasses } = useStyles();
  const [selectedTemplate, setTemplate] = useState(TEMPLATES_GROUPED[0].templates[0]);
  const { name: selectedTemplateName, iconName: selectedTemplateIconName } = getTemplateDetails(selectedTemplate.name);

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
          {TEMPLATES_GROUPED.map((group) => (
            <TemplatesGroup key={group.name}>
              <GroupName>{group.name}</GroupName>
              {group.templates.map((template) => {
                const { name, iconName } = getTemplateDetails(template.name);

                return (
                  <TemplateItem key={template.name} onClick={() => setTemplate(template)}>
                    <FontAwesomeIcon icon={iconName} />
                    <span>{name}</span>
                  </TemplateItem>
                );
              })}
            </TemplatesGroup>
          ))}
        </TemplatesSidebarHolder>
        <TemplatesDetailsHolder>
          <TemplateHeader>
            <TemplateDetails>
              <TemplateName key={selectedTemplateName}>
                <FontAwesomeIcon icon={selectedTemplateIconName} />
                <span>{selectedTemplateName}</span>
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
