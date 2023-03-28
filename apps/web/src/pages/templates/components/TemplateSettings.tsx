import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Group } from '@mantine/core';
import styled from '@emotion/styled';

import { Button, colors } from '../../../design-system';
import { NotificationSettingsForm } from './notification-setting-form/NotificationSettingsForm';
import { Trash } from '../../../design-system/icons';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useEnvController } from '../../../hooks';
import { useTemplateEditorForm } from './TemplateEditorFormProvider';
import { deleteTemplateById } from '../../../api/notification-templates';
import { ROUTES } from '../../../constants/routes.enum';
import { SubPageWrapper } from './SubPageWrapper';
import { WorkflowSettingsTabs } from './WorkflowSettingsTabs';

export const TemplateSettings = () => {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const { readonly } = useEnvController();
  const { editMode, trigger } = useTemplateEditorForm();
  const [toDelete, setToDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isError, setIsError] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  const confirmDelete = async () => {
    setIsDeleting(true);
    setIsError(undefined);
    try {
      await deleteTemplateById(templateId);
      setIsDeleting(false);
      setToDelete(false);
      navigate(ROUTES.TEMPLATES);
    } catch (e: any) {
      setIsDeleting(false);
      setIsError(e?.message || 'Unknown error');
    }
  };

  const cancelDelete = () => {
    setToDelete(false);
    setIsDeleting(false);
  };

  const onDelete = () => {
    setIsError(undefined);
    setToDelete(true);
  };

  return (
    <SubPageWrapper title="Workflow Settings">
      <WorkflowSettingsTabs />
      <NotificationSettingsForm trigger={trigger} />
      {editMode && (
        <Group position="right">
          <DeleteNotificationButton
            mt={48}
            variant="outline"
            disabled={readonly}
            data-test-id="delete-notification-button"
            onClick={onDelete}
          >
            <Trash
              style={{
                marginRight: '5px',
              }}
            />
            Delete Workflow
          </DeleteNotificationButton>
        </Group>
      )}
      <DeleteConfirmModal
        target="notification template"
        isOpen={toDelete}
        confirm={confirmDelete}
        cancel={cancelDelete}
        isLoading={isDeleting}
        error={isError}
      />
    </SubPageWrapper>
  );
};

const DeleteNotificationButton = styled(Button)`
  background: rgba(229, 69, 69, 0.15);
  color: ${colors.error};
  box-shadow: none;
  :hover {
    background: rgba(229, 69, 69, 0.15);
  }
`;
