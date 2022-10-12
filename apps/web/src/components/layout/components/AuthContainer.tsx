import React from 'react';
import { colors, Text, Title, Container } from '../../../design-system';

export default function AuthContainer({
  title,
  description = '',
  children,
  customDescription,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  customDescription?: React.ReactNode;
}) {
  return (
    <Container
      size={600}
      sx={{
        marginRight: '20%',
        paddingTop: '5%',
        '@media (max-width: 1500px)': {
          marginRight: '10%',
        },
        '@media (max-width: 1100px)': {
          marginRight: 'auto',
        },
      }}
    >
      <div style={{ marginTop: '30px' }}>
        <Title>{title}</Title>
        {customDescription || (
          <Text size="lg" color={colors.B60} mb={60} mt={20}>
            {description}
          </Text>
        )}
        {children}
      </div>
    </Container>
  );
}
