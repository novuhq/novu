import { Button } from '@novu/novui';
import { css } from '@novu/novui/css';
import { ApiServiceLevelEnum } from '@novu/shared';
import { useState } from 'react';
import { ContactSalesModal } from './ContactSalesModal';

export const ContactUsButton = () => {
  const [isContactSalesModalOpen, setIsContactSalesModalOpen] = useState(false);

  return (
    <>
      <Button className={styles.contactButton} onClick={() => setIsContactSalesModalOpen(true)}>
        Contact us
      </Button>
      <ContactSalesModal
        isOpen={isContactSalesModalOpen}
        onClose={() => {
          setIsContactSalesModalOpen(false);
        }}
        intendedApiServiceLevel={ApiServiceLevelEnum.ENTERPRISE}
      />
    </>
  );
};

const styles = {
  contactButton: css({
    background: '#34343A !important',
    fontWeight: '400 !important',
  }),
};
