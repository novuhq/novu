// What the router (router.ts) and a box's side of it (box.ts) hand each other over RPC.

// What Router.register gives a box: one signing secret, a fake bot token per agent, the real bot's workspace and user.
export interface SlackCredentials {
  readonly signingSecret: string;
  readonly tokens: Readonly<Record<string, string>>;
  readonly team: { readonly id: string; readonly name: string };
  readonly botUserId: string;
}

// An agent the box set up (Router.ready): its identifier, its id in the box's API, its Slack integration.
export interface SlackAgent {
  readonly identifier: string;
  readonly id: string;
  readonly integrationIdentifier: string;
}

// Box.slackEvent: an event for one of the box's agents, signed with the box's secret.
export interface SlackEvent {
  readonly id?: string;
  readonly agent: SlackAgent;
  readonly user?: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly timeoutMs?: number;
}

// The agent's answer; Box.slackEvent gives null while the box is asleep, starting or saving.
export interface SlackAnswer {
  readonly ok: boolean;
  readonly status: number;
  readonly contentType: string;
  readonly text: string;
}

// The last Slack events the router handed to the box's agents, in GET /__box/state.
export interface SlackEventNote {
  readonly id?: string | undefined;
  readonly agent: string;
  readonly user?: string | undefined;
  readonly status: number;
  readonly at: string;
}
