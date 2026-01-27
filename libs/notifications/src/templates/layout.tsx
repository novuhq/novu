import { Body, Container, Head, Html, Img, Preview, Tailwind } from '@react-email/components';
import React, { ReactNode } from 'react';

interface IBaseEmailLayoutProps {
  previewText: string;
  // ArokaGO: Use ReactNode type directly to avoid React 18/19 type conflicts
  children: ReactNode;
}

export function EmailLayout({ previewText, children }: IBaseEmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-solid border-[#eaeaea] p-[20px]">
            <Img
              src={`https://dashboard.novu.co/static/images/novu-colored-text.png`}
              width="100"
              height="37"
              alt="Novu"
              className="mx-auto my-[32px]"
            />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {children as any}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
