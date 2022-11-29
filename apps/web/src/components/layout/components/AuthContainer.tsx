import React from 'react';
import { colors, Text, Title, Container } from '../../../design-system';
import PageMeta from './PageMeta';

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
      sx={{
        display: 'flex',
        alignItems: 'center',
        margin: 0,
        '@media (max-width: 1100px)': {
          justifyContent: 'center',
        },
      }}
    >
      <PageMeta title={title} />
      <div style={{ margin: '30px 0', width: '100%', maxWidth: 550 }}>
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
