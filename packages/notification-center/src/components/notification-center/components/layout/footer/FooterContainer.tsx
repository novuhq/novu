import React from 'react';
import { Footer } from './Footer';
import { useNotificationCenter } from '../../../../../hooks';

export function FooterContainer() {
  const { footer } = useNotificationCenter();

  return <>{footer ? footer() : <Footer />}</>;
}
