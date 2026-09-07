import { Body, Container, Head, Heading, Html, Text } from '@react-email/components';

interface WelcomeEmailProps {
  name?: string;
}

export default function WelcomeEmail({ name = 'User' }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Heading>Welcome, {name}!</Heading>
          <Text>Thanks for joining us.</Text>
        </Container>
      </Body>
    </Html>
  );
}
