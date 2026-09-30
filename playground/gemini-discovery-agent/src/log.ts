export function log(event: string, data: Record<string, unknown>): void {
  console.log(JSON.stringify({ severity: 'INFO', event, ...data }));
}
