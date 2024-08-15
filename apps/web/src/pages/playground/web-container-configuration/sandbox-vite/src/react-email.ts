export const REACT_EMAIL_CODE = `import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Section,
  Text,
  Tailwind,
  render,
  Img
} from "@react-email/components";
import * as React from "react";

export const ReactEmail = ({
  title,
  buttonText,
  text,
}) => {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans px-2">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Section className="mt-[32px]">
              <Img
                src={'https://dashboard.novu.co/static/images/novu.png'}
                width="40"
                height="40"
                alt="Novu"
                className="my-0 mx-auto"
              />
            </Section>  
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[15px] mx-0">
              {title}
            </Heading>
            <Text className="text-[#666666] text-[12px] text-center leading-[24px]">
              {text}
            </Text>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={'https://google.com'}
              >
                {buttonText}
              </Button>
            </Section>
          
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export function renderEmail(controls) {
  return render(<ReactEmail {...controls} />);
}
`;
