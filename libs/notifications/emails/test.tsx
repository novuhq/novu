import { Body, Container, Head, Html, Preview, Text } from '@react-email/components';
import * as React from 'react';

export default function TestEmail() {
  return (
    <Html>
      <Head />
      <Preview>Test Email</Preview>
      <Body style={{ fontFamily: 'sans-serif' }}>
        <Container>
          <Text>This is a test email</Text>
        </Container>
      </Body>
    </Html>
  );
}
