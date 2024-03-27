import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Group } from '@mantine/core';
import styled from '@emotion/styled';
import { useFormContext } from 'react-hook-form';

import { Button, colors, Trash } from '@novu/design-system';
import { NotificationSettingsForm } from './notification-setting-form/NotificationSettingsForm';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useEnvController } from '../../../hooks';
import { useTemplateEditorForm } from './TemplateEditorFormProvider';
import { deleteTemplateById } from '../../../api/notification-templates';
import { ROUTES } from '../../../constants/routes.enum';
import { WorkflowSettingsTabs } from './WorkflowSettingsTabs';
import { IForm } from './formTypes';
import { WorkflowSidebar } from './WorkflowSidebar';

export const TemplateSettings = () => {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const { trigger, template } = useTemplateEditorForm();
  const { readonly } = useEnvController({}, template?.chimera);
  const [toDelete, setToDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isError, setIsError] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const { watch } = useFormContext<IForm>();

  const name = watch('name');

  const confirmDelete = async () => {
    setIsDeleting(true);
    setIsError(undefined);
    try {
      await deleteTemplateById(templateId);
      setIsDeleting(false);
      setToDelete(false);
      navigate(ROUTES.WORKFLOWS);
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
    <WorkflowSidebar title="Workflow Settings">
      <WorkflowSettingsTabs />
      <NotificationSettingsForm trigger={trigger} />
      <Group position="right" mt={'auto'} mb={24}>
        <DeleteNotificationButton
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
      <DeleteConfirmModal
        title={`Delete ${name} workflow?`}
        description={
          'This cannot be undone. ' +
          'The trigger code generated based on this workflow will be disabled and the notification will no longer be sent.'
        }
        isOpen={toDelete}
        isLoading={isDeleting}
        error={isError}
        confirm={confirmDelete}
        cancel={cancelDelete}
        confirmButtonText="Delete Workflow"
        cancelButtonText="Cancel"
      />
    </WorkflowSidebar>
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
