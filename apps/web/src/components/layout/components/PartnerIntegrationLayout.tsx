import { ThemeProvider } from '../../../design-system/ThemeProvider';

export function PartnerIntegrationLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div>{children}</div>
    </ThemeProvider>
  );
}
