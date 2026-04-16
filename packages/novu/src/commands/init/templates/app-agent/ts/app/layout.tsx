import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Novu Agent',
  description: 'Conversational AI agent powered by Novu',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
