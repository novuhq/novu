import { useState } from 'react';
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
            <div>Canvas</div>
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
