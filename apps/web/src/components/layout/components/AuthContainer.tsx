import React from 'react';
import { colors, Text, Title, Container } from '@novu/design-system';
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
        justifyContent: 'center',
        overflowY: 'auto',
        background: '#fff',
        borderRadius: '25px',
      }}
    >
      <PageMeta title={title} />
      <div style={{ margin: 'auto', padding: '40px 20px', width: '100%', maxWidth: 550 }}>
        <h1 style={{ color: '#000' }}>{title}</h1>
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
