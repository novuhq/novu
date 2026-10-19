import SideNav from '@/components/SideNav';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <SideNav />
      <main className="flex-1 overflow-y-auto">
        <div className="flex h-full justify-center p-5">
          <div className="flex flex-col gap-4 items-center w-full max-w-7xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
