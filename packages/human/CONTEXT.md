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
