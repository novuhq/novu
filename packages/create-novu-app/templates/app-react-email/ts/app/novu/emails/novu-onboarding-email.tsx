import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
  Hr,
  Tailwind,
  render,
} from "@react-email/components";
import * as React from "react";
import { ControlSchema, PayloadSchema } from "../workflows/";

type NovuWelcomeEmailProps = ControlSchema & PayloadSchema;

export const NovuWelcomeEmail = ({
  components,
  userImage,
  teamImage,
  arrowImage,
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
          <Img
            src={`https://images.spr.so/cdn-cgi/imagedelivery/j42No7y-dcokJuNgXeA0ig/dca73b36-cf39-4e28-9bc7-8a0d0cd8ac70/standalone-gradient2x_2/w=128,quality=90,fit=scale-down`}
            width="56"
            height="56"
            alt="Netlify"
            className="mx-auto my-20"
          />
          <Container className="bg-white p-45">
            {components?.map((component, componentIndex) => {
              return (
                <Section key={componentIndex}>
                  {component.componentType === "heading" ? (
                    <Column>
                      <h1 style={{ textAlign: "center" }}>
                        {component.componentText}
                      </h1>
                    </Column>
                  ) : null}

                  {component.componentType === "list" ? (
                    <Column>
                      <ul>
                        {component.componentListItems?.map(
                          (listItem, listItemIndex) => (
                            <li className="mb-20" key={listItemIndex}>
                              <strong>{listItem.title}</strong> {listItem.body}
                            </li>
                          ),
                        )}
                      </ul>
                    </Column>
                  ) : null}

                  {component.componentType === "button" ? (
                    <Column>
                      <Button className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3">
                        {component.componentText}
                      </Button>
                    </Column>
                  ) : null}

                  {component.componentType === "image" ? (
                    <Column>
                      <Img
                        src={component.src}
                        width="100"
                        height="100"
                        alt="first image"
                        className="mx-auto my-20"
                      />
                    </Column>
                  ) : null}

                  {component.componentType === "text" ? (
                    <Section>
                      <Text
                        className={"text-base " + "text-" + component.align}
                      >
                        {component.componentText}
                      </Text>
                    </Section>
                  ) : null}
                  {component.componentType === "divider" ? (
                    <Column>
                      {" "}
                      <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
                    </Column>
                  ) : null}
                  {component.componentType === "users" ? (
                    <Column>
                      <Section>
                        <Row>
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
                    </Column>
                  ) : null}
                </Section>
              );
            })}
          </Container>

          <Container className="mt-20">
            <Text className="text-center text-gray-400 mb-45">
              Novu, Emek Dotan 109, Apt 2, Modiin, Israel
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default NovuWelcomeEmail;

const heading = {
  fontSize: "30px",
  lineHeight: "1.1",
  fontWeight: "700",
  color: "#000000",
};

export function renderEmail(controls: ControlSchema, payload: PayloadSchema) {
  return render(<NovuWelcomeEmail {...controls} {...payload} />);
}
