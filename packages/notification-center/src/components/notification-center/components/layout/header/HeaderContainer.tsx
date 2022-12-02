import React from 'react';
import { useNotificationCenter } from '../../../../../hooks';
import { Header } from './Header';

export function HeaderContainer({ defaultHeader = <Header /> }) {
  const { header } = useNotificationCenter();

  return header ? header() : defaultHeader;
}
