export const BRIDGE_CODE = `import express from 'express';
import { workflow } from '@novu/framework';
import { serve } from '@novu/framework/express';
import { renderEmail } from './react-email';
import { z } from 'zod';

const helloWorld = workflow('hello-world', async ({ step, payload }) => {
    // Add more steps below this line

    // Email Step
    await step.email('send-email', async (controls) => {
      return {
        subject: controls.subject,
        body: renderEmail(controls)
      };
    },
    {
      controlSchema: z.object({
        subject: z.string().default('Welcome to Novu'),
        title: z.string().default('Welcome to Novu'),
        buttonText: z.string().default('Hello World'),
        footerText: z.string().default('This email is generated using Tailwind and React Email. You can change any of the content here using the Step Controls panel'),
      }),
    });
  },
  {
    payloadSchema: z.object({
      name: z.string().default('John'),
    }),
  }
);
const server = express();
server.use(express.json());
server.use(serve({ workflows: [helloWorld] }));
server.listen(9999);
`;

export const REACT_EMAIL_CODE = `
import {
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
  footerText,
}) => {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans px-2">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Section className="mt-[32px]">
              <Img
                src={'/static/images/novu-gray.svg'}
                width="40"
                height="40"
                alt="Novu"
                className="my-0 mx-auto"
              />
            </Section>  
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              {title}
            </Heading>
           
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={'https://google.com'}
              >
                {buttonText}
              </Button>
            </Section>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Text className="text-[#666666] text-[12px] leading-[24px]">
              {footerText}
            </Text>
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
