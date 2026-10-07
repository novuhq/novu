/** A CLI command inside running text. */
export function Command({ children }: { children: string }) {
  return <span className="font-mono text-[14px] text-foreground">{children}</span>;
}
