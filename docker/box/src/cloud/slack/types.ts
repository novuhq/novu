export interface SlackCredentials {
  readonly signingSecret: string;
  readonly tokens: Readonly<Record<string, string>>;
  readonly team: { readonly id: string; readonly name: string };
  readonly botUserId: string;
}

export interface SlackAgent {
  readonly identifier: string;
  readonly id: string;
  readonly integrationIdentifier: string;
}

export interface SlackEvent {
  readonly id?: string;
  readonly agent: SlackAgent;
  readonly user?: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly timeoutMs?: number;
}

export interface SlackAnswer {
  readonly ok: boolean;
  readonly status: number;
  readonly contentType: string;
  readonly text: string;
}

export interface SlackEventNote {
  readonly id?: string | undefined;
  readonly agent: string;
  readonly user?: string | undefined;
  readonly status: number;
  readonly at: string;
}
