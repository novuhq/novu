export const CONNECT_HELP_TEXT = `
Examples (non-interactive / agent / CI):

  Dashboard OAuth Slack (default — Novu account via browser):
    npx novu connect "A support assistant for Acme's customers that answers billing questions." \\
      --ci \\
      --channel slack

  Dashboard OAuth Email:
    npx novu connect "An onboarding assistant for Acme's new members." \\
      --ci \\
      --channel email

  Keyless Slack (no Novu account — pass --keyless):
    npx novu connect "A support assistant for Acme's customers that answers billing questions." \\
      --ci \\
      --keyless \\
      --channel slack

  Keyless Email:
    npx novu connect "An onboarding assistant for Acme's new members." \\
      --ci \\
      --keyless \\
      --channel email

  Keyless Telegram:
    npx novu connect "A concierge for Acme's shoppers that helps with orders." \\
      --ci \\
      --keyless \\
      --channel telegram

  Agent only (no channel):
    npx novu connect "An inventory assistant for Acme's ops staff." \\
      --ci \\
      --channel skip

  EU region:
    npx novu connect "A support assistant for Acme's EU customers." \\
      --ci \\
      --region eu \\
      --channel email

  Existing Novu account (secret key instead of dashboard OAuth):
    npx novu connect "A support assistant for Acme's customers." \\
      --ci \\
      --secret-key "$NOVU_SECRET_KEY" \\
      --channel slack

  Chat SDK bridge agent (no AI prompt required):
    npx novu connect \\
      --runtime chat-sdk \\
      --secret-key "$NOVU_SECRET_KEY" \\
      --channel telegram

  Chat SDK in CI:
    npx novu connect \\
      --ci \\
      --runtime chat-sdk \\
      --secret-key "$NOVU_SECRET_KEY" \\
      --channel slack

Non-interactive (agent / CI) contract:

  Required for --ci mode:
    - Pass the agent description as the positional <prompt> argument or --prompt.
    - Pass --channel <slack|email|telegram|skip> (or whatsapp/teams without --keyless).

  Authentication (pick one):
    - Dashboard OAuth (default): omit --secret-key and --keyless (opens /cli/auth; user approves in the browser; agent is created in their Development environment)
    - Keyless: pass --keyless (temporary agent; user claims via in-channel sign-up link)
    - Existing account: pass --secret-key (or set NOVU_SECRET_KEY in non-interactive shells)

  Channel-specific flags:
    - --channel slack    → no extra flags (CLI prints a secure setup link for the Slack config token)
    - --channel telegram → no extra flags (CLI prints a secure setup link for the BotFather token)
    - --channel email    → no extra flags
    - --channel skip     → no extra flags (agent only, no channel)

  Optional CI-only escape hatches (secrets injected via env — never paste in chat):
    - --slack-config-token "xoxe.xoxp-…"    → skip the setup page; pass token directly
    - --telegram-bot-token "123456:ABC-…"   → skip the setup page; pass token directly

  Defaults (do not pass unless needed):
    - Dashboard OAuth: omit --secret-key and --keyless (creates the agent in the user's Development environment)
    - Demo runtime: omit --runtime (shared Claude runtime in keyless mode; authenticated environments need a demo integration)
    - US region: omit --region (use --region eu for EU Novu Cloud)

  Not supported headlessly with --keyless:
    - whatsapp and teams → omit --keyless to authenticate via the dashboard, then finish channel setup in the dashboard

  Not supported headlessly in keyless mode:
    - whatsapp and teams → use the Novu dashboard instead; do not pass --channel whatsapp or --channel teams with --keyless

  One run = one new agent + one channel. Re-running creates another agent.

Machine-readable stdout (plain text, no ANSI — watch these in --ci mode):

  Authentication (dashboard OAuth — default):
    NOVU_CONNECT_AUTH_URL_FILE=<absolute path to one-line auth URL file>

  Slack:
    NOVU_CONNECT_SLACK_SETUP_URL=<url>
    NOVU_CONNECT_SLACK_CONFIG_TOKEN_SAVED=1
    NOVU_CONNECT_SLACK_AUTHORIZE_URL=<url>

  Email:
    NOVU_CONNECT_INBOUND_ADDRESS=<address>
    NOVU_CONNECT_MAILTO=<mailto-url>
    NOVU_CONNECT_SEND_FROM_EMAIL=<email>   (only when present)

  Telegram:
    NOVU_CONNECT_TELEGRAM_BOTFATHER_URL=<url>             (only when present)
    NOVU_CONNECT_TELEGRAM_SETUP_URL=<url>
    NOVU_CONNECT_TELEGRAM_SETUP_QR_PNG=<absolute png path>  (only when present)
    NOVU_CONNECT_TELEGRAM_DEEPLINK_URL=<url>
    NOVU_CONNECT_TELEGRAM_BOT_USERNAME=<name>
    NOVU_CONNECT_TELEGRAM_DEEPLINK_QR_PNG=<absolute png path>   (only when present)

  Chat SDK (requirements summary):
    NOVU_CONNECT_CHAT_SDK_REQUIREMENTS_FILE=<absolute path to requirements summary file>

  Success:
    ✓ Your agent is live.

Behavior & exit codes:

  - For slack, email, and telegram: the CLI blocks and polls for the handoff (up to ~5 min).
  - Exit 0 on success (prints "✓ Your agent is live." with agent identifier and dashboard URL).
  - Non-zero exit on failure (prints "✗ ..." with an error message).
  - Safe to re-run on Slack OAuth timeout or "Failed to create Slack app" (the Slack app is reused).

  Do not redirect stdout to a log file — read output from the shell session directly.

Full end-to-end agent onboarding guide:
  https://github.com/novuhq/novu/blob/main/packages/shared/docs/agent-onboarding.md
`;
