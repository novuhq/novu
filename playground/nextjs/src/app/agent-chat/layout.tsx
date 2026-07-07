import '@/styles/globals.css';

export const metadata = {
  title: 'Agent Web Chat — Novu headless hooks + AI Elements',
};

export default function AgentChatLayout({ children }: { children: React.ReactNode }) {
  return <main className="h-screen overflow-hidden">{children}</main>;
}
