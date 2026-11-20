import { afterEach, describe, expect, it, vi } from 'vitest';
import { CARD_VIEW_MIME_TYPE, CARD_VIEW_URI, pictureDomainsOf } from './card-view';
import worker from './index';
import { AGENT_INBOX_API, inSession, rpc, setup, stubBackends } from './spec-support';

type ToolCall = {
  result: { content: Array<{ text: string }>; structuredContent?: Record<string, unknown>; isError?: boolean };
};

type ToolList = { result: { tools: Array<{ name: string; _meta?: Record<string, unknown> }> } };

type ResourceRead = {
  result: { contents: Array<{ uri: string; mimeType: string; text: string; _meta?: Record<string, unknown> }> };
};

async function callCard(env: ReturnType<typeof setup>['env'], ctx: ReturnType<typeof setup>['ctx'], session?: string) {
  const request = rpc('tools/call', { name: 'agent_card', arguments: {} });
  const response = await worker.fetch(session ? inSession(request, session) : request, env, ctx);

  return ((await response.json()) as ToolCall).result;
}

async function cardTool(env: ReturnType<typeof setup>['env'], ctx: ReturnType<typeof setup>['ctx'], session: string) {
  const response = await worker.fetch(inSession(rpc('tools/list', {}), session), env, ctx);

  return ((await response.json()) as ToolList).result.tools.find((tool) => tool.name === 'agent_card');
}

describe('agent_card', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('says hi and shows the card: the name, the address and the link', async () => {
    const calls = stubBackends();
    const { env, ctx } = setup();

    const result = await callCard(env, ctx);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe(
      [
        'Hi Ada, I’m Atlas. I have my own inbox now. Here’s my card, so people can email or message me directly.',
        '',
        'Atlas',
        'Email: atlas@agentinbox.md',
        'Card: https://agentinbox.md/p/atlas (anyone can email or message Atlas from there)',
      ].join('\n')
    );
    // The API keeps the first showing, with the way in it came: the dashboard's onboarding reads it.
    const shown = calls.find((call) => call.url === `${AGENT_INBOX_API}/v1/agent/card`);
    expect(shown?.method).toBe('POST');
    expect(shown?.headers.get('Agent-Inbox-Via')).toBe('mcp');
  });

  it('points to setup while there is no agent yet', async () => {
    stubBackends({ agent: null });
    const { env, ctx } = setup();

    const result = await callCard(env, ctx);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/inbox_setup/);
  });

  describe('the card drawn in the chat', () => {
    it('gives ChatGPT and Claude the view and what it draws: the name, the address, the card and its picture', async () => {
      stubBackends();
      const { env, ctx } = setup();

      for (const session of ['chatgpt.session', 'claude.session']) {
        const tool = await cardTool(env, ctx, session);
        const result = await callCard(env, ctx, session);

        expect(tool?._meta).toEqual({ ui: { resourceUri: CARD_VIEW_URI }, 'openai/outputTemplate': CARD_VIEW_URI });
        expect(result.structuredContent).toEqual({
          name: 'Atlas',
          address: 'atlas@agentinbox.md',
          url: 'https://agentinbox.md/p/atlas',
          imageUrl: 'https://agentinbox.md/p/atlas/card-image',
        });
        // The text stays for the model, which reads it in every host.
        expect(result.content[0].text).toMatch(/^Hi Ada, I’m Atlas\./);
      }
    });

    it('gives every other host the card as text alone', async () => {
      stubBackends();
      const { env, ctx } = setup();

      for (const session of ['claude-code.session', 'codex.session', 'cursor.session', 'general.session']) {
        expect((await cardTool(env, ctx, session))?._meta).toBeUndefined();
        expect((await callCard(env, ctx, session)).structuredContent).toBeUndefined();
      }
    });

    it('serves the view to the hosts that draw it, with the dashboard as the one place its picture comes from', async () => {
      stubBackends();
      const { env, ctx } = setup();

      const response = await worker.fetch(
        inSession(rpc('resources/read', { uri: CARD_VIEW_URI }), 'chatgpt.session'),
        env,
        ctx
      );
      const [view] = ((await response.json()) as ResourceRead).result.contents;

      expect(view.mimeType).toBe(CARD_VIEW_MIME_TYPE);
      expect(view.text).toContain('ui/initialize');
      expect(view.text).toContain('ui/notifications/size-changed');
      expect(view._meta).toMatchObject({
        ui: { csp: { resourceDomains: ['https://agentinbox.example.test', 'https://www.agentinbox.example.test'] } },
        'openai/widgetCSP': {
          resource_domains: ['https://agentinbox.example.test', 'https://www.agentinbox.example.test'],
        },
      });
    });

    it('has no view for the hosts that don’t draw it', async () => {
      stubBackends();
      const { env, ctx } = setup();

      const response = await worker.fetch(inSession(rpc('resources/list', {}), 'claude-code.session'), env, ctx);
      const body = (await response.json()) as { result?: { resources: unknown[] }; error?: unknown };

      expect(body.result?.resources ?? []).toEqual([]);
    });
  });

  describe('pictureDomainsOf', () => {
    it('allows the dashboard with and without www., which the API is at', () => {
      expect(pictureDomainsOf('https://www.agentinbox.md/api')).toEqual([
        'https://agentinbox.md',
        'https://www.agentinbox.md',
      ]);
      expect(pictureDomainsOf(null)).toEqual([]);
    });
  });
});
