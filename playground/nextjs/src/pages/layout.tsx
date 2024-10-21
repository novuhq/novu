import Header from '@/components/Header';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <Header />
      <div className="flex justify-center p-5 h-screen">
        <div className="text-center flex flex-col gap-4">{children}</div>
      </div>
    </main>
  );
}
