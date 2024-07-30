import Header from '@/components/Header';
import Link from 'next/link';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <Header />
      <div className="flex justify-center p-5 bg-white h-screen">{children}</div>
    </main>
  );
}
