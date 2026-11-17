import { apiUrlFlag } from './agent-setup-prompt';
import { NPX_CLI } from './onboarding';

/**
 * `/setup.md`, what an agent reads when a channel drawer's prompt sends it here ("Read agentinbox.md/setup.md,
 * then run inbox channel add whatsapp"). The prompt stays a few words the operator can read at a glance; how to
 * run `inbox`, log in, hand over the link and wait lives here. `apiUrl` is this site's API, so a local or
 * staging site's page names its own API in every command.
 */
export function setupMarkdown(apiUrl: string): string {
  const api = apiUrlFlag({ apiUrl });
  const cli = NPX_CLI;

  return [
    '# Agent Inbox: connect a channel',
    '',
    'Your operator copied a prompt from their Agent Inbox dashboard that asks you to turn on a channel for their agent: Telegram, Slack or WhatsApp. This page is how. The prompt names the agent, the channel and when you are done.',
    '',
    '## The `inbox` command',
    '',
    `\`inbox\` in the prompt is the Agent Inbox CLI. Run it as \`${cli}\`, which needs nothing installed: \`inbox channel add whatsapp\` is \`${cli} channel add whatsapp${api}\`. If \`inbox\` is already a command on this computer, from \`npm install -g @agentinbox/cli\`, use it as it is.`,
    ...(api
      ? [
          '',
          `This page belongs to the Agent Inbox at \`${apiUrl}\`, not the public one: add \`${api.trim()}\` to every command, as written here.`,
        ]
      : []),
    '',
    '## 1. Run the command from the prompt',
    '',
    `\`${cli} channel add <telegram|slack|whatsapp>${api}\` prints a link and then waits, up to 15 minutes, until your operator finished on that page. Run it in the background or with a long timeout if your host stops commands sooner. If it stops before they finish, run it again: it picks up where they left off.`,
    '',
    `It needs your operator's Agent Inbox account. When it says this computer isn't logged in, or runs a keyless demo, run \`${cli} login${api}\`: it prints a link and a code and waits up to an hour. Give both to your operator, who signs in, checks the code matches and approves. Then run the channel command again.`,
    '',
    '## 2. Give your operator the link',
    '',
    'Show the link in your chat with your operator and nowhere else: whoever opens it connects the channel as them. Never send it through the inbox, and never ask for a bot token, a Slack token or Meta (WhatsApp) keys. The page collects what it needs.',
    '',
    '- **WhatsApp:** the link opens WhatsApp Business setup on Agent Inbox, the "Meta link" in the prompt. Your operator signs in with Facebook, picks their Meta business account and the number the agent uses, then sends any message from their own WhatsApp to connect their number. WhatsApp only connects for the agent that `setup` made for your operator, and Meta bills its messages to their Meta Business account.',
    '- **Telegram:** the page has them create a bot with BotFather and press Start.',
    "- **Slack:** the page has them install the agent's own Slack app in their workspace.",
    '',
    '## 3. Check that it works',
    '',
    `The command ends by saying the channel is connected. Ask your operator to send the agent a message on that channel, then run \`${cli} list --filter unread${api}\`: you are done when their message is there.`,
    '',
    '## No terminal? Use `channel_add`',
    '',
    'When your host can\'t run commands but has the Agent Inbox MCP server, call `channel_add` with the channel (`"telegram"`, `"slack"` or `"whatsapp"`) and give your operator the link it returns, the same way. It answers at once rather than waiting: call it again once they say they finished, until it says the channel is connected. Then check with `inbox_list`.',
    '',
    '## When something goes wrong',
    '',
    "- **The channel isn't available for this account yet:** say so to your operator and offer one that is.",
    '- **The link expired or stopped working:** run the command (or `channel_add`) again for a new one.',
    "- **Your host won't let you run a command,** for example one that saves a key: tell your operator the exact command and let them run it in their terminal.",
    '',
  ].join('\n');
}
