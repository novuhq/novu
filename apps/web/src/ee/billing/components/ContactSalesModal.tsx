import React from 'react';
import { Modal, Title, successMessage } from '@novu/design-system';
import { ApiServiceLevelEnum } from '@novu/shared';
import { HubspotForm } from './HubspotForm';
import { HUBSPOT_FORM_IDS } from '../utils/hubspot.constants';
import { useAuth } from '../../../hooks/useAuth';

type ContactSalesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  intendedApiServiceLevel: ApiServiceLevelEnum;
};

export const ContactSalesModal = ({ isOpen, onClose, intendedApiServiceLevel }: ContactSalesModalProps) => {
  const { currentUser, currentOrganization } = useAuth();
  if (!isOpen || !currentUser || !currentOrganization) {
    return null;
  }

  return (
    <Modal
      styles={{
        body: {
          paddingTop: '0px !important',
        },
        modal: {
          width: 840,
        },
      }}
      padding={40}
      withCloseButton={false}
      size="xl"
      opened={isOpen}
      title={undefined}
      onClose={onClose}
    >
      <Title mb={8}>Contact sales</Title>
      <HubspotForm
        formId={HUBSPOT_FORM_IDS.UPGRADE_CONTACT_SALES}
        properties={{
          firstname: currentUser.firstName || '',
          lastname: currentUser.lastName || '',
          email: currentUser.email || '',
          app_organizationid: currentOrganization._id,
          'TICKET.subject': `Contact Sales - ${intendedApiServiceLevel}`,
          'TICKET.content': '',
        }}
        readonlyProperties={['email']}
        focussedProperty="TICKET.content"
        onFormSubmitted={() => {
          successMessage('Thank you for contacting us! We will be in touch soon.');
          onClose();
        }}
      />
    </Modal>
  );
};
