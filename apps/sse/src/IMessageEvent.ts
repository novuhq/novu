/**
 * https://docs.nestjs.com/techniques/server-sent-events
 * The sse method returns an Observable that emits multiple MessageEvent.
 * The MessageEvent object should respect the following interface to match the specification
 */
export interface MessageEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}