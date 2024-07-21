import React from "react";
import {
  Body,
  Button,
  CodeInline,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  render,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { ControlSchema, PayloadSchema } from "../workflows";

type NovuWelcomeEmailProps = ControlSchema & PayloadSchema;

export const NovuWelcomeEmail = ({
  components,
  userImage,
  teamImage,
  arrowImage,
  showHeader,
}: NovuWelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Novu Welcome</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                brand: "#2250f4",
                offwhite: "#fafbfb",
                blurwhite: "#f3f3f5",
              },
              spacing: {
                0: "0px",
                20: "20px",
                45: "45px",
              },
            },
          },
        }}
      >
        <Body className="bg-blurwhite text-base font-sans">
          {showHeader ? (
            <Img
              src={`https://images.spr.so/cdn-cgi/imagedelivery/j42No7y-dcokJuNgXeA0ig/dca73b36-cf39-4e28-9bc7-8a0d0cd8ac70/standalone-gradient2x_2/w=128,quality=90,fit=scale-down`}
              width="56"
              height="56"
              alt="Novu"
              className="mx-auto my-20"
            />
          ) : null}

          <Container className="bg-white p-45">
            {components?.map((component, componentIndex) => {
              return (
                <Section key={componentIndex}>
                  {component.type === "heading" ? (
                    <Section>
                      <Heading as="h1" className={`text-${component.align}`}>
                        {component.text}
                      </Heading>
                    </Section>
                  ) : null}

                  {component.type === "button" ? (
                    <Section className={`text-${component.align}`}>
                      <Button
                        href={"http://localhost:2022"}
                        className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                      >
                        {component.text}
                      </Button>
                    </Section>
                  ) : null}

                  {component.type === "text" ? (
                    <Section>
                      <Text className={`text-base text-${component.align}`}>
                        {component.text}
                      </Text>
                    </Section>
                  ) : null}

                  {component.type === "users" ? (
                    <Section className={"mb-5"}>
                      <Row>
                        <Text
                          className={`text-[#666666] text-[12px] leading-[24px] text-${component.align}`}
                        >
                          {component.text}
                        </Text>
                      </Row>
                      <Row align={component.align}>
                        <Column align="right">
                          <Img
                            className="rounded-full"
                            src={userImage}
                            width="64"
                            height="64"
                          />
                        </Column>
                        <Column align="center">
                          <Img
                            src={arrowImage}
                            width="12"
                            height="9"
                            alt="invited you to"
                          />
                        </Column>
                        <Column align="left">
                          <Img
                            className="rounded-full"
                            src={teamImage}
                            width="64"
                            height="64"
                          />
                        </Column>
                      </Row>
                    </Section>
                  ) : null}
                  {component.type === "code" ? (
                    <Section>
                      <CodeInline>{component.text}</CodeInline>;
                    </Section>
                  ) : null}
                </Section>
              );
            })}
          </Container>

          <Container className="mt-20">
            <Text className="text-center text-gray-400 mb-45">
              Powered by Novu, the Code-First Notification Infrastructure
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default NovuWelcomeEmail;

export function renderEmail(controls: ControlSchema, payload: PayloadSchema) {
  return render(<NovuWelcomeEmail {...controls} {...payload} />);
}
