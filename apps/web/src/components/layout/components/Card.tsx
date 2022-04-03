import React from 'react';
import { Container, Space } from '@mantine/core';
import { Title } from '../../../design-system';

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <Container mb={20} ml={0} p={0} pl={0} pr={0} sx={{ paddingTop: '41px' }}>
      <Title size={2}>{title}</Title>
      <Space h={35} />
      {children}
    </Container>
  );
};

export default Card;
