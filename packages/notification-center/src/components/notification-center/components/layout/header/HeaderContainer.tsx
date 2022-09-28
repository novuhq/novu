import React from 'react';
import { Header } from './Header';
import { useNotificationCenter } from '../../../../../hooks';

export function HeaderContainer({ defaultHeader = <Header /> }) {
  const { header } = useNotificationCenter();

  return header ? header() : defaultHeader;
}
