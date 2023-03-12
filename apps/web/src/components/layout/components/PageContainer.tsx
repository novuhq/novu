import React from 'react';
import { Container } from '../../../design-system';
import PageMeta from './PageMeta';
import { ContainerProps } from '@mantine/core';

export type PageContainerProps = { fullSize?: boolean } & ContainerProps;

function PageContainer({ children, fullSize, ...props }: PageContainerProps) {
  return (
    <Container pl={0} pr={0} fluid {...props} style={fullSize ? { minHeight: '100%', display: 'flex' } : {}}>
      <PageMeta />
      {children}
    </Container>
  );
}

export default PageContainer;
