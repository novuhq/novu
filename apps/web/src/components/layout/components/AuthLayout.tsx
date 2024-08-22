import React from 'react';
import { Title, Container } from '@novu/design-system';

export default function AuthLayout({ title = '', children }: { title?: string; children: React.ReactNode }) {
  return (
    <Container
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        overflowY: 'auto',
        height: '100vh',
      }}
    >
      <div style={{ margin: 'auto', padding: '40px 20px', width: '100%', maxWidth: 550 }}>
        {title && <Title data-test-id="auth-container-title">{title}</Title>}
        {children}
      </div>
    </Container>
  );
}
