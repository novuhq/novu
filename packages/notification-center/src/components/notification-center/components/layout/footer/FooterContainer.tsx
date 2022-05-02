/* eslint-disable max-len */
import React, { useContext } from 'react';
import { Footer } from './Footer';
import { NotificationCenterContext } from '../../../../../store/notification-center.context';

export function FooterContainer() {
  const { footer } = useContext(NotificationCenterContext);

  return <>{footer ? footer() : <Footer />}</>;
}
