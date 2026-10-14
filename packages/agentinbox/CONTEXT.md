# Agent Inbox

Agent Inbox lets AI agents reach the people they work for on Telegram, Slack or email, and wait for their answer. It spans the `@agentinbox/cli` CLI, the Agent Inbox API module (`apps/api/src/app/human`) and agentinbox.md (`apps/human-dashboard`), and runs on Novu underneath without people ever seeing Novu.

## Language

### People

**Operator**:
The person who sets Agent Inbox up for their agents and signs up on agentinbox.md.
_Avoid_: owner, user, inviter

**Contact**:
Anyone an operator's agents can reach, including the operator.
_Avoid_: subscriber, recipient

**Stranger**:
A person or service that writes to an agent without being one of its contacts.
_Avoid_: unknown sender, guest, anonymous

### Agents

**Agent**:
The identity contacts see and talk to: one name, one picture, one presence on each channel.
_Avoid_: relay, bot

**Host**:
The program that acts as an agent for an operator, such as Claude Code or a scheduled routine; each agent has one host.
_Avoid_: caller, client, AI agent

### Inbox

**Inbox**:
All the conversations of one agent.
_Avoid_: mailbox, queue

**Conversation**:
Everything said between an agent and the people in one place on one channel; it can hold several contacts and strangers.
_Avoid_: thread, chat, ticket

**Unread**:
A conversation where someone said something that did not answer a question from the agent, and the agent has not responded since; looking at a conversation is not a response.
_Avoid_: new, pending

**Open**:
A conversation whose current matter is not finished, whether or not it is unread.
_Avoid_: active, in progress

**Resolved**:
A conversation the host has declared finished; it becomes open again when anyone says something in it.
_Avoid_: closed, archived, done

### Accounts

**Agent Inbox account**:
An operator's sign-in on agentinbox.md.
_Avoid_: Human account, Agent Inbox user

**Backing organization**:
The hidden Novu organization, with its hidden Novu user, behind an Agent Inbox account; it holds that account's agents, channels and contacts.
_Avoid_: shadow org, Novu account, workspace

**Keyless setup**:
What an operator builds with the CLI before signing up.
_Avoid_: demo, demo workspace

**Claim**:
Moving a keyless setup into the operator's backing organization.
_Avoid_: transfer, migrate

**CLI login**:
Letting the CLI on one computer act for an Agent Inbox account, once the operator enters the code it shows on agentinbox.md.
_Avoid_: device session, CLI auth, connecting
