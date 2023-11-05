import React from 'react';
import { Container, Space, Sx } from '@mantine/core';
import { Title } from '@novu/design-system';

const Card = ({
  title,
  children,
  space = 35,
  sx,
}: {
  title: string;
  children: React.ReactNode;
  space?: string | number;
  sx?: Sx | (Sx | undefined)[];
}) => {
  return (
    <Container mb={20} ml={0} p={0} pl={0} pr={0} sx={{ paddingTop: '41px', ...sx }}>
      <Title size={2}>{title}</Title>
      <Space h={space} />
      {children}
    </Container>
  );
};

export default Card;
