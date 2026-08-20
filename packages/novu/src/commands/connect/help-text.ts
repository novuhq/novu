export const CONNECT_HELP_TEXT = `
Examples (non-interactive / agent / CI):

  Dashboard OAuth Slack (default — Novu account via browser):
    npx novu connect "A support assistant for Acme's customers that answers billing questions." \\
      --ci \\
      --channel slack

  Custom code bridge — AI SDK (dashboard OAuth, no agent description):
    npx novu connect \\
      --ci \\
      --runtime ai-sdk \\
      --channel slack

  Custom code bridge — LangChain:
    npx novu connect \\
      --ci \\
      --runtime langchain \\
      --channel slack

  AI SDK scaffold with OpenAI API key:
    npx novu connect \\
      --ci \\
      --runtime ai-sdk \\
      --llm-auth openai \\
      --openai-api-key "$OPENAI_API_KEY" \\
      --channel slack

  AI SDK scaffold with ChatGPT subscription (Codex CLI must be logged in):
    npx novu connect \\
      --ci \\
      --runtime ai-sdk \\
      --llm-auth codex-subscription \\
      --channel slack

  LangChain scaffold with Anthropic API key:
    npx novu connect \\
      --ci \\
      --runtime langchain \\
      --llm-auth anthropic \\
      --anthropic-api-key "$ANTHROPIC_API_KEY" \\
      --channel slack

  Dashboard OAuth Email:
    npx novu connect "An onboarding assistant for Acme's new members." \\
      --ci \\
      --channel email

  Dashboard OAuth WhatsApp (Meta Embedded Signup — completed in the browser, CLI polls until done):
    npx novu connect "A support assistant for Acme's customers that answers billing questions." \\
      --ci \\
      --channel whatsapp

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

  Keyless WhatsApp (Meta Embedded Signup — completed in the browser, CLI polls until done):
    npx novu connect "A support assistant for Acme's customers that answers billing questions." \\
      --ci \\
      --keyless \\
      --channel whatsapp

  Keyless iMessage (Sendblue) — all four flags required (no secure setup page):
    npx novu connect "A concierge for Acme's shoppers that helps with orders." \\
      --ci \\
      --keyless \\
      --channel sendblue \\
      --sendblue-api-key "$SENDBLUE_API_KEY" \\
      --sendblue-secret-key "$SENDBLUE_SECRET_KEY" \\
      --sendblue-from "+14155550100" \\
      --sendblue-test-phone "+14155550123"

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
    - Pass the agent description as the positional <prompt> argument or --prompt (managed path only).
    - Pass --channel <slack|email|telegram|sendblue|whatsapp|agent-chat|skip> (teams only without --keyless).
    - Bridge path: pass --runtime ai-sdk or --runtime langchain (omit the positional description).

  Authentication (pick one):
    - Dashboard OAuth (default): omit --secret-key and --keyless (opens /cli/auth; user approves in the browser; agent is created in their Development environment)
    - Keyless: pass --keyless (temporary agent; user claims via in-channel sign-up link)
    - Existing account: pass --secret-key (or set NOVU_SECRET_KEY in non-interactive shells)

  Channel-specific flags:
    - --channel slack    → no extra flags (CLI prints a secure setup link for the Slack config token)
    - --channel telegram → no extra flags (CLI prints a secure setup link for the BotFather token)
    - --channel email    → no extra flags
    - --channel sendblue → requires --sendblue-api-key, --sendblue-secret-key, --sendblue-from (E.164 agent/sender number), and --sendblue-test-phone (E.164 recipient phone); no secure setup page
    - --channel whatsapp → no extra flags; works with --keyless. When Meta Embedded Signup is available the CLI prints a public tokenized signup URL (valid ~30 min, no dashboard login needed), polls until signup completes in the browser (~15 min budget), then waits for an inbound WhatsApp message. When unavailable (flag off / self-hosted without Meta Tech Provider credentials) a keyless run prompts dashboard sign-in and retries; if still unavailable the CLI opens the dashboard integrations tab and exits.
    - --channel skip     → no extra flags (agent only, no channel)
    - --channel agent-chat → no extra flags. Links Agent Chat, prints dashboard Chat tab URL. Embed path writes env vars; scaffold path creates an example app. Use --agent-chat-setup scaffold|embed|skip in --ci (auto-detect when omitted).

  Optional CI-only escape hatches (secrets injected via env — never paste in chat):
    - --slack-config-token "xoxe.xoxp-…"    → skip the setup page; pass token directly
    - --telegram-bot-token "123456:ABC-…"   → skip the setup page; pass token directly

  LLM wiring (fresh empty-dir scaffold for --runtime ai-sdk or --runtime langchain only):
    - --llm-auth openai --openai-api-key "$OPENAI_API_KEY"  → wire OpenAI; skips the Ink picker (no --ci required)
    - --llm-auth anthropic --anthropic-api-key "$ANTHROPIC_API_KEY"  → wire Anthropic; skips the Ink picker
    - --llm-auth codex-subscription  → OAuth via codex login (ai-sdk) or langchainjs-codex-oauth (langchain)
    - --llm-auth claude-subscription  → ai-sdk only; requires prior claude auth login
    - --llm-auth skip  → demo echo agent (default when omitted)
    - Omitted on existing projects (reconcile path only; no LLM rewire)

  Defaults (do not pass unless needed):
    - Dashboard OAuth: omit --secret-key and --keyless (creates the agent in the user's Development environment)
    - Demo runtime: omit --runtime (shared Claude runtime in keyless mode; authenticated environments need a demo integration)
    - US region: omit --region (use --region eu for EU Novu Cloud)

  Not supported headlessly with --keyless:
    - teams → do not pass --channel teams with --keyless; omit --keyless to authenticate via the dashboard (teams finishes in the dashboard)

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

  iMessage (Sendblue):
    NOVU_CONNECT_SENDBLUE_IMESSAGE_URL=<sms:…>
    NOVU_CONNECT_SENDBLUE_FROM_NUMBER=<+E.164>
    NOVU_CONNECT_SENDBLUE_WEBHOOK_CALLBACK_URL=<url>   (only when webhook auto-registration fails)
    NOVU_CONNECT_SENDBLUE_WEBHOOK_SECRET=<secret>      (only when present)

  WhatsApp (only when Meta Embedded Signup is available; otherwise the CLI opens the dashboard and exits):
    NOVU_CONNECT_WHATSAPP_SIGNUP_URL=<url>            (deliver to the user; signup completes in the browser)
    NOVU_CONNECT_WHATSAPP_WA_ME_URL=<url>             (only when present)
    NOVU_CONNECT_WHATSAPP_WA_ME_QR_PNG=<absolute png path>   (only when present)
    NOVU_CONNECT_WHATSAPP_PHONE_NUMBER=<number>       (only when present)

  Agent Chat:
    NOVU_CONNECT_AGENT_CHAT_DASHBOARD_URL=<url>
    NOVU_CONNECT_AGENT_CHAT_EMBED_PROMPT_FILE=<absolute path>   (embed only; omitted on scaffold / skip)

  Chat SDK (requirements summary):
    NOVU_CONNECT_CHAT_SDK_REQUIREMENTS_FILE=<absolute path to requirements summary file>

  AI SDK bridge (requirements summary):
    NOVU_CONNECT_AI_SDK_REQUIREMENTS_FILE=<absolute path to requirements summary file>

  LangChain bridge (requirements summary):
    NOVU_CONNECT_LANGCHAIN_REQUIREMENTS_FILE=<absolute path to requirements summary file>

  Success:
    ✓ Your agent is live.

Behavior & exit codes:

  - For slack, email, telegram, and sendblue: the CLI blocks and polls for the handoff (up to ~5 min).
  - For whatsapp (when embedded signup is available): the CLI polls signup completion for up to ~15 min, then the inbound test message for up to ~5 min. Re-running resumes where signup left off.
  - For agent-chat: no inbound poll. Links the channel, prints NOVU_CONNECT_AGENT_CHAT_DASHBOARD_URL, then embed/scaffold (embed prints NOVU_CONNECT_AGENT_CHAT_EMBED_PROMPT_FILE).
  - Exit 0 on success (prints "✓ Your agent is live." with agent identifier and dashboard URL).
  - Non-zero exit on failure (prints "✗ ..." with an error message).
  - Safe to re-run on Slack OAuth timeout or "Failed to create Slack app" (the Slack app is reused).

  Do not redirect stdout to a log file — read output from the shell session directly.

Full end-to-end agent onboarding guide:
  https://github.com/novuhq/novu/blob/main/packages/shared/docs/agent-onboarding.md
`;
