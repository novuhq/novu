import { Body, Container, Html } from '@react-email/components';

export default function IgnoredEmail() {
  return (
    <Html>
      <Body>
        <Container>This file matches *.test.tsx pattern and should be ignored</Container>
      </Body>
    </Html>
  );
}
