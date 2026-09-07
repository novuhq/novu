import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Novu Chat SDK',
  description: 'Multi-channel chat bot powered by Chat SDK and Novu',
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
