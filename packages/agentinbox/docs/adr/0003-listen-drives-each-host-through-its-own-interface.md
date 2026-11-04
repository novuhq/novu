---
status: accepted
date: 2026-10-23
---

# listen drives each host through its own interface, so every host can ask during a run

`listen` starts a host for a message, and the host asks the operator, on their channel, before anything its settings don't allow, while it waits. So the listener talks to each host through the interface that host offers another program for exactly that: Claude Code in print mode with stream-json both ways and `--permission-prompt-tool stdio`, Codex through `codex app-server` (JSON-RPC over stdio), and OpenCode through `opencode serve`. One small adapter per host (`src/listen/<host>.ts`, behind `HostAdapter`) turns that interface into the few calls the listener's core makes: open or go on with a session, take a message (also while it works), say when a turn ends, ask and wait for the answer, stop. The core keeps the lease, the sessions, the limits and every question, the same for all of them. Inkbox does the same, with a separate bridge for each host.

## Considered options

- **Start each host the way a person scripts it (`claude -p`, `codex exec`, `opencode run`), with rules set beforehand.** Rejected: such a run can't ask anyone. A command its rules don't allow either fails the run or has to be allowed in advance, so the operator is never asked during a run, and allowing in advance means allowing more than they would.
- **One shared protocol for every host, the Agent Client Protocol (ACP), through bridges where a host doesn't speak it (`codex-acp`, `claude-code-acp`).** Rejected for hosts with an interface of their own: a bridge is one more program to install and keep up to date, and it lags behind its host. Each host's own interface reaches what ACP doesn't carry: Claude Code's "Allow for this session" rules, the words of a deny, a message that joins a turn already running. ACP stays the way in for a host whose own interface it is.

## Consequences

- Each new host is an adapter and a fake of its host for the tests (`fake-<host>.fixture.mjs`), never a change to the core. A host with no such interface can't be started by `listen`, or only with rules set beforehand.
- Interfaces change with their hosts (Codex still marks `app-server` experimental, and OpenCode 2 has another API than OpenCode 1). Each adapter says which version it was built against, and its check stops with an update hint when the host doesn't answer as expected. OpenCode's one adapter speaks both of its APIs, picked by `opencode --version`, as OpenCode's own app does for the servers it reaches.
- A host whose settings allow everything by default, as OpenCode's do, gets the listener's own rules for the session on top: its commands, the web and its MCP tools ask, while the operator's own rules still decide what they name. MCP tools are told by their names, not by the servers the host lists, which it can list late. What can't ask is off for the session whatever the operator's rules say: OpenCode 2's Code Mode, whose scripts have a `fetch` of their own, and OpenCode 1's subagents, which drop the session's asks.
- Nothing of any host ships with the CLI: each adapter starts the operator's own install, with their sign-in, settings and plan.
