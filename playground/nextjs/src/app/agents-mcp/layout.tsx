import '@/styles/globals.css';
import AppSideNav from '../agent-toolkit/app-sidenav';

export const metadata = {
  title: 'Agent MCP OAuth — Playground',
};

export default function AgentsMcpLayout({ children }: { children: React.ReactNode }) {
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
