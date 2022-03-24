import React from 'react';
import { colors, Text, Title, Container } from '../../../design-system';

export default function AuthContainer({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Container
      size={600}
      sx={{
        marginRight: '20%',
        marginTop: '10%',
        '@media (max-width: 1500px)': {
          marginRight: '10%',
        },
      }}>
      <Title>{title}</Title>
      <Text size="lg" color={colors.B60} mb={60} mt={20}>
        {description}
      </Text>
      {children}
    </Container>
  );
}
