import React from 'react';
import { useNotificationCenter } from '../../../../../hooks';
import { Footer } from './Footer';

export function FooterContainer() {
  const { footer } = useNotificationCenter();

  return <>{footer ? footer() : <Footer />}</>;
}
