import { Body, Container, Html } from '@react-email/components';

export default function TestEmail() {
  return (
    <Html>
      <Body>
        <Container>This is a test file and should be ignored</Container>
      </Body>
    </Html>
  );
}
