import { UnsavedChangesAlertDialog } from '@/components/unsaved-changes-alert-dialog';

export interface FormProtectionProps {
  onClose: () => void;
  showAlert: boolean;
  setShowAlert: (show: boolean) => void;
}

export const FormProtection = ({ onClose, showAlert, setShowAlert }: FormProtectionProps) => {
  const handleProceed = () => {
    setShowAlert(false);
    onClose();
  };

  const handleCancel = () => {
    setShowAlert(false);
  };

  return <UnsavedChangesAlertDialog show={showAlert} onCancel={handleCancel} onProceed={handleProceed} />;
};
