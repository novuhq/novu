import '@/styles/globals.css';
import AppSideNav from './app-sidenav';

export const metadata = {
  title: 'Refund Agent — HITL Playground',
};

export default function AgentToolkitLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen overflow-hidden">
          <AppSideNav />
          <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
