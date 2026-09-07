import { Inbox, NovuProvider } from '../dist/esm/index.js';

export function InboxOnlyApp() {
  return (
    <NovuProvider applicationIdentifier="app" subscriberId="sub">
      <Inbox />
    </NovuProvider>
  );
}
