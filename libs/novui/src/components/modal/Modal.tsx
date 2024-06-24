import { Modal as ExternalModal, ModalProps as ExternalModalProps } from '@mantine/core';
import { CoreProps } from '../../types';
import { modal } from '../../../styled-system/recipes';
import { splitCssProps } from '../../../styled-system/jsx';
import { css, cx } from '../../../styled-system/css';

interface IModalProps extends ExternalModalProps, CoreProps {
  opened: boolean;
  onClose: () => void;
  size: 'lg' | 'xl' | 'md';
  centered: boolean;
}

export const Modal = ({ children, ...props }: IModalProps) => {
  const [variantProps, modalProps] = modal.splitVariantProps({ ...props });
  const [cssProps, localProps] = splitCssProps(modalProps);
  const { opened, centered, size, className, ...otherProps } = localProps;
  const styles = modal(variantProps);

  return (
    <ExternalModal opened={opened} className={cx(css(cssProps), className)} classNames={styles} {...otherProps}>
      {children}
    </ExternalModal>
  );
};

Modal.Header = ExternalModal.Header;
Modal.Body = ExternalModal.Body;
