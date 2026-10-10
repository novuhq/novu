# Human

Human lets AI agents reach the people they work for on Telegram, Slack or email, and wait for their answer. It spans the `@novu/human` CLI, the Human API module (`apps/api/src/app/human`) and gethuman.md (`apps/human-dashboard`), and runs on Novu underneath without people ever seeing Novu.

## Language

### People

**Operator**:
The person who sets Human up for their agents and signs up on gethuman.md.
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
All the threads of one agent.
_Avoid_: mailbox, queue

**Thread**:
Everything said between an agent and the people in one place on one channel; it can hold several contacts and strangers.
_Avoid_: conversation, chat, ticket

**Unread**:
A thread where someone said something that did not answer a question from the agent, and the agent has not responded since; looking at a thread is not a response.
_Avoid_: new, pending

**Open**:
A thread whose current matter is not finished, whether or not it is unread.
_Avoid_: active, in progress

**Resolved**:
A thread the host has declared finished; it becomes open again when anyone says something in it.
_Avoid_: closed, archived, done

### Accounts

**Human account**:
An operator's sign-in on gethuman.md.
_Avoid_: gethuman account, Human user

**Backing organization**:
The hidden Novu organization, with its hidden Novu user, behind a Human account; it holds that account's agents, channels and contacts.
_Avoid_: shadow org, Novu account, workspace

**Keyless setup**:
What an operator builds with the CLI before signing up.
_Avoid_: demo, demo workspace

**Claim**:
Moving a keyless setup into the operator's backing organization.
_Avoid_: transfer, migrate

**CLI login**:
Letting the `human` CLI on one computer act for a Human account, once the operator enters the code it shows on gethuman.md.
_Avoid_: device session, CLI auth, connecting
